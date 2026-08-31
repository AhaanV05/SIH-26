-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('GOVERNMENT', 'STARTUP', 'PLATFORM');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('PROBLEM_OWNER', 'PROCUREMENT_REVIEWER', 'FINANCE_OFFICER', 'EVALUATOR', 'STARTUP_ADMIN', 'STARTUP_CONTRIBUTOR', 'PLATFORM_ADMIN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'APPLICATIONS_CLOSED', 'EVALUATION', 'PILOT_SELECTED', 'PILOT_ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SpecVersionStatus" AS ENUM ('DRAFT', 'APPROVED', 'FROZEN', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL_BUSINESS', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceSourceType" AS ENUM ('CONTROLLED_RUN', 'HUMAN_UPLOAD', 'SYSTEM_EXPORT');

-- CreateEnum
CREATE TYPE "EvidenceAssuranceLevel" AS ENUM ('AUTHORITY_ASSERTED', 'OFFICER_VERIFIED', 'SYSTEM_OBSERVED', 'THIRD_PARTY_ATTESTED', 'SELF_DECLARED', 'SIMULATED_FOR_DEMO');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ELIGIBILITY_REVIEW', 'ELIGIBLE', 'INELIGIBLE', 'EVALUATION', 'SHORTLISTED', 'SELECTED', 'NOT_SELECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ProposalAttachmentVisibility" AS ENUM ('GOVERNMENT_ONLY', 'EVALUATOR_ONLY', 'PUBLIC_AFTER_DECISION');

-- CreateEnum
CREATE TYPE "EvaluatorAssignmentStatus" AS ENUM ('ASSIGNED', 'CONFLICT_DECLARED', 'SCORING', 'SCORED', 'MODERATED');

-- CreateEnum
CREATE TYPE "ModerationDecisionType" AS ENUM ('SELECTED', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "PilotStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PilotFinalDecision" AS ENUM ('GO', 'NO_GO', 'ITERATE');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'ACCEPTED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceObjectKind" AS ENUM ('DATASET', 'TEST_RUN', 'LIMITATIONS_NOTE', 'TELEMETRY', 'OFFICER_OBSERVATION', 'ACCESSIBILITY_REPORT', 'SECURITY_REPORT');

-- CreateEnum
CREATE TYPE "SandboxRunStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MetricQualityStatus" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "EvidenceClaimSubjectType" AS ENUM ('PILOT', 'MILESTONE', 'SOLUTION', 'STARTUP');

-- CreateEnum
CREATE TYPE "EvidenceVerificationMethod" AS ENUM ('AUTOMATIC', 'MANUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "MilestoneAcceptanceStatus" AS ENUM ('READY_FOR_HUMAN_ACCEPTANCE', 'NOT_READY');

-- CreateEnum
CREATE TYPE "MilestoneReviewDecision" AS ENUM ('ACCEPTED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ChangeRequestDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentRequestState" AS ENUM ('NOT_READY', 'DRAFT', 'FINANCE_REVIEW', 'APPROVED', 'ADAPTER_SUBMITTED', 'PROCESSING', 'PAID', 'RETURNED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationMode" AS ENUM ('LIVE', 'SANDBOX', 'SIMULATED', 'OFFLINE_FIXTURE');

-- CreateEnum
CREATE TYPE "PaymentActorRole" AS ENUM ('PILOT_REVIEWER', 'FINANCE_OFFICER', 'PAYMENT_ADAPTER');

-- CreateEnum
CREATE TYPE "SolutionCardStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "TransferabilityRecommendation" AS ENUM ('REUSE_EVIDENCE_AND_ROUTE_TO_AUTHORIZED_PROCUREMENT', 'RUN_LOCALIZED_MICRO_PILOT', 'REQUIRE_FRESH_COMPETITIVE_DISCOVERY', 'NOT_CURRENTLY_TRANSFERABLE');

-- CreateEnum
CREATE TYPE "AdoptionPathway" AS ENUM ('REUSE_EVIDENCE', 'LOCALIZED_MICRO_PILOT', 'FRAMEWORK_ROUTE', 'FRESH_EVALUATION');

-- CreateEnum
CREATE TYPE "AdoptionRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeTo" TIMESTAMP(3),

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxonomyPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "website" TEXT,
    "foundedOn" TIMESTAMP(3),
    "stage" TEXT,
    "employeeBand" TEXT,
    "deploymentModels" JSONB NOT NULL,
    "supportedLanguages" JSONB NOT NULL,
    "capabilityCodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartupProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupCapability" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL,
    "evidenceSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialEvidence" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifierMasked" TEXT,
    "issuer" TEXT NOT NULL,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "assuranceLevel" "EvidenceAssuranceLevel" NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verificationRef" TEXT,
    "fileRef" TEXT,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotAttestation" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "issuerDepartmentId" TEXT NOT NULL,
    "outcomeHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "PilotAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeSpecVersion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" "SpecVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeSpecVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "eligibilityPass" BOOLEAN NOT NULL,
    "semanticScore" DOUBLE PRECISION NOT NULL,
    "evidenceScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "outcomes" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "pilotCostInPaise" BIGINT NOT NULL,
    "risks" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalAttachment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileRef" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "visibility" "ProposalAttachmentVisibility" NOT NULL DEFAULT 'GOVERNMENT_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluatorAssignment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "status" "EvaluatorAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictDeclaration" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "hasConflict" BOOLEAN NOT NULL,
    "details" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "rubricCriterionId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationDecision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "decision" "ModerationDecisionType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pilot" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startupLeadId" TEXT NOT NULL,
    "status" "PilotStatus" NOT NULL DEFAULT 'PLANNED',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "budgetInPaise" BIGINT NOT NULL,
    "finalDecision" "PilotFinalDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PilotMetric" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseline" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,

    CONSTRAINT "PilotMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paymentPercent" DOUBLE PRECISION NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "requiredMetricIds" TEXT[],
    "requiredEvidenceKinds" "EvidenceObjectKind"[],
    "acceptanceStatement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxRun" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "manifestVersion" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "calculatorVersion" TEXT NOT NULL,
    "status" "SandboxRunStatus" NOT NULL,
    "sourceEvidenceObjectIds" TEXT[],
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceObject" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "kind" "EvidenceObjectKind" NOT NULL,
    "displayName" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "assuranceLevel" "EvidenceAssuranceLevel" NOT NULL,
    "sourceType" "EvidenceSourceType" NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricObservation" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "metricDefinitionVersion" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "calculatorVersion" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceEvidenceObjectIds" TEXT[],
    "qualityStatus" "MetricQualityStatus" NOT NULL,
    "qualityIssues" TEXT[],
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceClaim" (
    "id" TEXT NOT NULL,
    "subjectType" "EvidenceClaimSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "assuranceLevel" "EvidenceAssuranceLevel" NOT NULL,
    "verificationMethod" "EvidenceVerificationMethod" NOT NULL,
    "supportingEvidenceObjectIds" TEXT[],
    "supportingMetricObservationIds" TEXT[],
    "contradictingEvidenceObjectIds" TEXT[],
    "issuerId" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneAcceptanceEvaluation" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "status" "MilestoneAcceptanceStatus" NOT NULL,
    "rulesSatisfied" BOOLEAN NOT NULL,
    "blockerCodes" TEXT[],
    "summary" TEXT NOT NULL,
    "metricEvaluations" JSONB NOT NULL,
    "evidenceEvaluations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneAcceptanceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneReview" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "MilestoneReviewDecision" NOT NULL,
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "probability" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "mitigation" TEXT,
    "ownerId" TEXT NOT NULL,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "change" TEXT NOT NULL,
    "impact" TEXT,
    "decision" "ChangeRequestDecision" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "state" "PaymentRequestState" NOT NULL DEFAULT 'NOT_READY',
    "integrationMode" "IntegrationMode" NOT NULL,
    "amountInPaise" BIGINT,
    "invoiceReference" TEXT,
    "budgetReference" TEXT,
    "beneficiaryReference" TEXT,
    "adapterIdempotencyKey" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "fromState" "PaymentRequestState" NOT NULL,
    "toState" "PaymentRequestState" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "PaymentActorRole" NOT NULL,
    "reason" TEXT,
    "adapterReplayKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionCard" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcomes" JSONB NOT NULL,
    "limitations" TEXT,
    "evidenceStrength" TEXT NOT NULL,
    "status" "SolutionCardStatus" NOT NULL DEFAULT 'DRAFT',
    "attestedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferabilityAssessment" (
    "id" TEXT NOT NULL,
    "solutionCardId" TEXT NOT NULL,
    "sourceContextId" TEXT NOT NULL,
    "targetDepartmentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "recommendation" "TransferabilityRecommendation" NOT NULL,
    "factors" JSONB NOT NULL,
    "bindingConstraints" TEXT[],
    "reasons" TEXT[],
    "gaps" TEXT[],
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferabilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionRequest" (
    "id" TEXT NOT NULL,
    "solutionCardId" TEXT NOT NULL,
    "targetDepartmentId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "pathway" "AdoptionPathway" NOT NULL,
    "status" "AdoptionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdoptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "reason" TEXT,
    "classification" "DataClassification" NOT NULL DEFAULT 'INTERNAL',
    "metadata" JSONB,
    "previousHash" TEXT,
    "eventHash" TEXT NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Organization_type_status_idx" ON "Organization"("type", "status");

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_role_key" ON "Membership"("userId", "organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Capability_code_key" ON "Capability"("code");

-- CreateIndex
CREATE INDEX "Capability_taxonomyPath_idx" ON "Capability"("taxonomyPath");

-- CreateIndex
CREATE UNIQUE INDEX "StartupProfile_organizationId_key" ON "StartupProfile"("organizationId");

-- CreateIndex
CREATE INDEX "StartupCapability_capabilityId_idx" ON "StartupCapability"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "StartupCapability_startupId_capabilityId_key" ON "StartupCapability"("startupId", "capabilityId");

-- CreateIndex
CREATE INDEX "CredentialEvidence_startupId_type_idx" ON "CredentialEvidence"("startupId", "type");

-- CreateIndex
CREATE INDEX "PilotAttestation_startupId_idx" ON "PilotAttestation"("startupId");

-- CreateIndex
CREATE INDEX "PilotAttestation_pilotId_idx" ON "PilotAttestation"("pilotId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_processId_key" ON "Challenge"("processId");

-- CreateIndex
CREATE INDEX "Challenge_departmentId_status_idx" ON "Challenge"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Challenge_ownerId_idx" ON "Challenge"("ownerId");

-- CreateIndex
CREATE INDEX "ChallengeSpecVersion_contentHash_idx" ON "ChallengeSpecVersion"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeSpecVersion_challengeId_version_key" ON "ChallengeSpecVersion"("challengeId", "version");

-- CreateIndex
CREATE INDEX "Match_startupId_idx" ON "Match"("startupId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_challengeId_startupId_key" ON "Match"("challengeId", "startupId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_challengeId_startupId_key" ON "Proposal"("challengeId", "startupId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluatorAssignment_proposalId_evaluatorId_key" ON "EvaluatorAssignment"("proposalId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ConflictDeclaration_assignmentId_key" ON "ConflictDeclaration"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_assignmentId_rubricCriterionId_key" ON "Score"("assignmentId", "rubricCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "Pilot_proposalId_key" ON "Pilot"("proposalId");

-- CreateIndex
CREATE INDEX "Pilot_challengeId_status_idx" ON "Pilot"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PilotMetric_pilotId_metricDefinitionId_key" ON "PilotMetric"("pilotId", "metricDefinitionId");

-- CreateIndex
CREATE INDEX "Milestone_pilotId_status_idx" ON "Milestone"("pilotId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_pilotId_sequence_key" ON "Milestone"("pilotId", "sequence");

-- CreateIndex
CREATE INDEX "EvidenceObject_pilotId_kind_idx" ON "EvidenceObject"("pilotId", "kind");

-- CreateIndex
CREATE INDEX "EvidenceObject_milestoneId_idx" ON "EvidenceObject"("milestoneId");

-- CreateIndex
CREATE INDEX "MetricObservation_pilotId_metricDefinitionId_idx" ON "MetricObservation"("pilotId", "metricDefinitionId");

-- CreateIndex
CREATE INDEX "EvidenceClaim_subjectType_subjectId_idx" ON "EvidenceClaim"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "MilestoneAcceptanceEvaluation_milestoneId_idx" ON "MilestoneAcceptanceEvaluation"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_milestoneId_key" ON "PaymentRequest"("milestoneId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentRequestId_idx" ON "PaymentEvent"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionCard_pilotId_key" ON "SolutionCard"("pilotId");

-- CreateIndex
CREATE INDEX "TransferabilityAssessment_solutionCardId_idx" ON "TransferabilityAssessment"("solutionCardId");

-- CreateIndex
CREATE INDEX "TransferabilityAssessment_targetDepartmentId_idx" ON "TransferabilityAssessment"("targetDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_sequence_key" ON "AuditEvent"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_eventHash_key" ON "AuditEvent"("eventHash");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_idx" ON "AuditEvent"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupProfile" ADD CONSTRAINT "StartupProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupCapability" ADD CONSTRAINT "StartupCapability_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupCapability" ADD CONSTRAINT "StartupCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialEvidence" ADD CONSTRAINT "CredentialEvidence_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotAttestation" ADD CONSTRAINT "PilotAttestation_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotAttestation" ADD CONSTRAINT "PilotAttestation_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotAttestation" ADD CONSTRAINT "PilotAttestation_issuerDepartmentId_fkey" FOREIGN KEY ("issuerDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSpecVersion" ADD CONSTRAINT "ChallengeSpecVersion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeSpecVersion" ADD CONSTRAINT "ChallengeSpecVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalAttachment" ADD CONSTRAINT "ProposalAttachment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorAssignment" ADD CONSTRAINT "EvaluatorAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluatorAssignment" ADD CONSTRAINT "EvaluatorAssignment_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictDeclaration" ADD CONSTRAINT "ConflictDeclaration_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EvaluatorAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EvaluatorAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationDecision" ADD CONSTRAINT "ModerationDecision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationDecision" ADD CONSTRAINT "ModerationDecision_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pilot" ADD CONSTRAINT "Pilot_startupLeadId_fkey" FOREIGN KEY ("startupLeadId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotMetric" ADD CONSTRAINT "PilotMetric_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxRun" ADD CONSTRAINT "SandboxRun_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceObject" ADD CONSTRAINT "EvidenceObject_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceObject" ADD CONSTRAINT "EvidenceObject_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SandboxRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAcceptanceEvaluation" ADD CONSTRAINT "MilestoneAcceptanceEvaluation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCard" ADD CONSTRAINT "SolutionCard_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCard" ADD CONSTRAINT "SolutionCard_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCard" ADD CONSTRAINT "SolutionCard_attestedById_fkey" FOREIGN KEY ("attestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferabilityAssessment" ADD CONSTRAINT "TransferabilityAssessment_solutionCardId_fkey" FOREIGN KEY ("solutionCardId") REFERENCES "SolutionCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferabilityAssessment" ADD CONSTRAINT "TransferabilityAssessment_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionRequest" ADD CONSTRAINT "AdoptionRequest_solutionCardId_fkey" FOREIGN KEY ("solutionCardId") REFERENCES "SolutionCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionRequest" ADD CONSTRAINT "AdoptionRequest_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionRequest" ADD CONSTRAINT "AdoptionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

