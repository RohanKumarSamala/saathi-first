import { plans, type Plan } from '../content/site'

/** The one service billed per visit rather than by the hour. */
export const PROPERTY_SERVICE_ID = 'property-monitoring'
export const isPerVisitService = (serviceId: string) => serviceId === PROPERTY_SERVICE_ID

export const propertyPlan = plans.find((plan) => plan.id === 'property') as Plan

/** Hourly companion plans, shortest first. */
export const companionPlans = plans
  .filter((plan): plan is Plan & { hours: number } => typeof plan.hours === 'number')
  .sort((a, b) => a.hours - b.hours)

export const MIN_HOURS = 1
export const MAX_HOURS = companionPlans.at(-1)?.hours ?? 12
export const wholeDayPlan = companionPlans.find((plan) => plan.wholeDay)

/** The smallest plan that covers `hours`. */
export const planForHours = (hours: number) => companionPlans.find((plan) => plan.hours >= hours)

/** The text stored with a booking and checked by firestore.rules, e.g. "₹499 / up to 4 hrs". */
export const priceLabel = (plan: Plan) => `${plan.price} / ${plan.unit}`

export const hoursLabel = (hours: number) =>
  wholeDayPlan && hours === wholeDayPlan.hours ? `Whole day (${hours} hours)` : `${hours} hour${hours === 1 ? '' : 's'}`
