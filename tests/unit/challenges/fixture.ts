import {
  createChallengeSpecDraft,
  type ChallengeSpec,
} from "../../../src/modules/challenges";

export { createChallengeSpecDraft };

export function cloneChallengeSpec(specification: ChallengeSpec): ChallengeSpec {
  return JSON.parse(JSON.stringify(specification)) as ChallengeSpec;
}

