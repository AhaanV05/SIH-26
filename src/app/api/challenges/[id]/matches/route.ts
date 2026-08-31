import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/platform/db/client";
import {
  rankStartupMatches,
  type ChallengeMatchInput,
  type StartupProfileMatchInput,
} from "@/modules/matching";
import { type ChallengeSpec } from "@/modules/challenges";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ChallengeWithSpec = Prisma.ChallengeGetPayload<{
  include: {
    specVersions: {
      orderBy: { version: "desc" };
      take: 1;
    };
  };
}>;

type StartupProfileWithRelations = Prisma.StartupProfileGetPayload<{
  include: {
    organization: true;
    capabilities: {
      include: {
        capability: true;
      };
    };
    credentialEvidence: true;
  };
}>;

function mapChallengeToMatchInput(challenge: ChallengeWithSpec): ChallengeMatchInput {
  const doc = challenge.specVersions?.[0]?.document as ChallengeSpec | null | undefined;

  const eligibilityCriteria = (doc?.eligibility ?? []).map((el) => ({
    id: el.id,
    kind: el.kind,
    mandatory: el.mandatory,
    acceptedEvidence: el.acceptedEvidence,
    verificationMethod: el.verificationMethod,
  }));

  const capabilityCodesFromOutcomes = doc?.outcomes?.flatMap((o) => o.metricIds ?? []) ?? [];
  const keywords = [
    ...(doc?.problem?.affectedUsers ?? []),
    ...(doc?.problem?.geography ?? []),
  ];

  return {
    challengeId: challenge.id,
    departmentId: challenge.departmentId,
    title: challenge.title,
    problem: challenge.problem,
    requiredCapabilityCodes:
      capabilityCodesFromOutcomes.length > 0
        ? capabilityCodesFromOutcomes
        : ["civic-ops.cv.overflow-detection", "civic-ops.logistics.route-optimization"],
    desiredCapabilityCodes: ["civic-ops.iot.fill-sensing", "localization.language.marathi"],
    eligibilityCriteria:
      eligibilityCriteria.length > 0
        ? eligibilityCriteria
        : [
            {
              id: "EL-1",
              kind: "STARTUP_RECOGNITION",
              mandatory: true,
              acceptedEvidence: ["AUTHORITY_ASSERTED", "OFFICER_VERIFIED", "SIMULATED_FOR_DEMO"],
            },
            {
              id: "EL-2",
              kind: "SECURITY_READINESS",
              mandatory: true,
              acceptedEvidence: ["OFFICER_VERIFIED", "THIRD_PARTY_ATTESTED", "SYSTEM_OBSERVED"],
            },
          ],
    preferredDeploymentModels: ["ON_PREMISE_GOVERNMENT_CLOUD", "HYBRID", "CLOUD_MANAGED"],
    preferredLanguages: ["mr", "hi", "en", "mr-IN", "en-IN"],
    targetLocations: doc?.problem?.geography ?? ["Pune", "Maharashtra"],
    keywords,
  };
}

function mapStartupProfileToMatchInput(
  profile: StartupProfileWithRelations,
): StartupProfileMatchInput {
  const capabilities = (profile.capabilities ?? []).map((c) => ({
    capabilityCode: c.capability.code,
    name: c.capability.name,
    taxonomyPath: c.capability.taxonomyPath,
    proficiency: c.proficiency,
    evidenceSummary: c.evidenceSummary ?? undefined,
  }));

  const credentialEvidence = (profile.credentialEvidence ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    assuranceLevel: e.assuranceLevel,
    status: e.status,
    issuedAt: e.issuedAt ? e.issuedAt.toISOString() : null,
    expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
    verificationRef: e.verificationRef ?? null,
    synthetic: e.synthetic,
  }));

  const deploymentModels = Array.isArray(profile.deploymentModels)
    ? (profile.deploymentModels as string[])
    : [];
  const supportedLanguages = Array.isArray(profile.supportedLanguages)
    ? (profile.supportedLanguages as string[])
    : [];
  const capabilityCodes = Array.isArray(profile.capabilityCodes)
    ? (profile.capabilityCodes as string[])
    : capabilities.map((c) => c.capabilityCode);

  return {
    startupId: profile.id,
    organizationId: profile.organizationId,
    legalName: profile.organization?.legalName ?? profile.id,
    displayName:
      profile.organization?.displayName ?? profile.organization?.legalName ?? profile.id,
    summary: profile.summary,
    capabilityCodes,
    capabilities,
    credentialEvidence,
    deploymentModels,
    supportedLanguages,
    website: profile.website,
    stage: profile.stage,
  };
}

async function getChallengeAndStartups(challengeId: string) {
  const [challenge, startups] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        specVersions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    }),
    prisma.startupProfile.findMany({
      include: {
        organization: true,
        capabilities: {
          include: {
            capability: true,
          },
        },
        credentialEvidence: true,
      },
    }),
  ]);

  return { challenge, startups };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing challenge ID" },
        { status: 400 },
      );
    }

    const { challenge, startups } = await getChallengeAndStartups(id);

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found", challengeId: id },
        { status: 404 },
      );
    }

    const challengeMatchInput = mapChallengeToMatchInput(challenge);
    const startupMatchInputs = startups.map(mapStartupProfileToMatchInput);
    const batchResult = rankStartupMatches(challengeMatchInput, startupMatchInputs);

    const url = new URL(request.url);
    const shouldPersist = url.searchParams.get("persist") === "true";

    if (shouldPersist && batchResult.rankedMatches.length > 0) {
      await Promise.all(
        batchResult.rankedMatches.map((match) =>
          prisma.match.upsert({
            where: {
              challengeId_startupId: {
                challengeId: match.challengeId,
                startupId: match.startupId,
              },
            },
            create: {
              id: match.id,
              challengeId: match.challengeId,
              startupId: match.startupId,
              eligibilityPass: match.eligibilityPass,
              semanticScore: match.semanticScore,
              evidenceScore: match.evidenceScore,
              overallScore: match.overallScore,
              confidence: match.confidence,
              explanation: match.explanation as unknown as Prisma.InputJsonValue,
              modelVersion: match.modelVersion,
              generatedAt: new Date(match.generatedAt),
            },
            update: {
              eligibilityPass: match.eligibilityPass,
              semanticScore: match.semanticScore,
              evidenceScore: match.evidenceScore,
              overallScore: match.overallScore,
              confidence: match.confidence,
              explanation: match.explanation as unknown as Prisma.InputJsonValue,
              modelVersion: match.modelVersion,
              generatedAt: new Date(match.generatedAt),
            },
          }),
        ),
      );
    }

    return NextResponse.json(batchResult, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error during matching";
    return NextResponse.json(
      { error: "Failed to evaluate challenge matches", details: message },
      { status: 500 },
    );
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid or missing challenge ID" },
        { status: 400 },
      );
    }

    const { challenge, startups } = await getChallengeAndStartups(id);

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found", challengeId: id },
        { status: 404 },
      );
    }

    const challengeMatchInput = mapChallengeToMatchInput(challenge);
    const startupMatchInputs = startups.map(mapStartupProfileToMatchInput);
    const batchResult = rankStartupMatches(challengeMatchInput, startupMatchInputs);

    if (batchResult.rankedMatches.length > 0) {
      await Promise.all(
        batchResult.rankedMatches.map((match) =>
          prisma.match.upsert({
            where: {
              challengeId_startupId: {
                challengeId: match.challengeId,
                startupId: match.startupId,
              },
            },
            create: {
              id: match.id,
              challengeId: match.challengeId,
              startupId: match.startupId,
              eligibilityPass: match.eligibilityPass,
              semanticScore: match.semanticScore,
              evidenceScore: match.evidenceScore,
              overallScore: match.overallScore,
              confidence: match.confidence,
              explanation: match.explanation as unknown as Prisma.InputJsonValue,
              modelVersion: match.modelVersion,
              generatedAt: new Date(match.generatedAt),
            },
            update: {
              eligibilityPass: match.eligibilityPass,
              semanticScore: match.semanticScore,
              evidenceScore: match.evidenceScore,
              overallScore: match.overallScore,
              confidence: match.confidence,
              explanation: match.explanation as unknown as Prisma.InputJsonValue,
              modelVersion: match.modelVersion,
              generatedAt: new Date(match.generatedAt),
            },
          }),
        ),
      );
    }

    return NextResponse.json(
      {
        ...batchResult,
        persisted: true,
        persistedCount: batchResult.rankedMatches.length,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error during match persistence";
    return NextResponse.json(
      { error: "Failed to compute and persist challenge matches", details: message },
      { status: 500 },
    );
  }
}
