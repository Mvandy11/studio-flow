export const MEMBERSHIP_PLANS = {
  member_30: {
    label: "Member",
    price: 30,
    rewardPool: 10,
    eventCreatorPool: 0,
  },
  creator_50: {
    label: "Creator Member",
    price: 50,
    rewardPool: 10,
    eventCreatorPool: 15,
  },
};

export function getPoolContributions(tier) {
  const plan = MEMBERSHIP_PLANS[tier];
  if (!plan) return { rewardPool: 0, eventCreatorPool: 0 };
  return {
    rewardPool: plan.rewardPool,
    eventCreatorPool: plan.eventCreatorPool,
  };
}
