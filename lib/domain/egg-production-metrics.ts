const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const WEEK_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS;

export interface ProductiveFlock {
  id: string;
  birdCount: number;
  arrivalAgeWeeks: number;
  arrivalDate: string;
}

export interface FlockMortality {
  flockId: string | null;
  date: string;
  deadBirds: number;
}

interface EggProductionMetricInput {
  flocks: ProductiveFlock[];
  mortalities: FlockMortality[];
  startDate: string;
  endDate: string;
  totalEggs: number;
}

export interface EggProductionMetrics {
  eggGoal: number;
  layingRate: number;
  layingRateGoal: number;
  eligibleBirdDays: number;
  dailyTargets: EggProductionDailyTarget[];
}

export interface EggProductionDailyTarget {
  date: string;
  eggGoal: number;
  layingRateGoal: number;
  eligibleBirds: number;
}

export interface FlockProductionEligibility {
  isEligible: boolean;
  reason?: string;
}

export function calculateLiveBirdsAtDate(
  flocks: ProductiveFlock[],
  mortalities: FlockMortality[],
  date: string,
): number {
  return flocks.reduce((total, flock) => {
    if (flock.arrivalDate > date) return total;

    const deaths = mortalities.reduce((flockDeaths, mortality) => {
      if (mortality.flockId !== flock.id || mortality.date > date) return flockDeaths;
      return flockDeaths + mortality.deadBirds;
    }, 0);

    return total + Math.max(flock.birdCount - deaths, 0);
  }, 0);
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getExpectedLayingRate(ageWeeks: number): number {
  if (ageWeeks < 18) return 0;
  if (ageWeeks < 22) return 28;
  if (ageWeeks < 25) return 70;
  if (ageWeeks < 35) return 96;
  if (ageWeeks < 60) return 93;
  if (ageWeeks < 75) return 88;
  if (ageWeeks <= 90) return 80;
  return 68;
}

function getAgeAtDate(flock: ProductiveFlock, date: Date): number | undefined {
  const arrivalDate = parseDate(flock.arrivalDate);
  const elapsedMilliseconds = date.getTime() - arrivalDate.getTime();
  if (elapsedMilliseconds < 0) return undefined;

  return flock.arrivalAgeWeeks + Math.floor(elapsedMilliseconds / WEEK_IN_MILLISECONDS);
}

export function getFlockProductionEligibility(
  flock: ProductiveFlock,
  mortalities: FlockMortality[],
  date: string,
  isDiscarded: boolean,
): FlockProductionEligibility {
  if (isDiscarded) {
    return { isEligible: false, reason: "O lote está em estado de descarte." };
  }

  const ageWeeks = getAgeAtDate(flock, parseDate(date));
  if (ageWeeks === undefined) {
    return { isEligible: false, reason: "O lote ainda não havia chegado à granja nesta data." };
  }
  if (getExpectedLayingRate(ageWeeks) === 0) {
    return { isEligible: false, reason: "O lote ainda não atingiu 18 semanas nesta data." };
  }
  if (calculateLiveBirdsAtDate([flock], mortalities, date) === 0) {
    return { isEligible: false, reason: "O lote não possui aves vivas nesta data." };
  }

  return { isEligible: true };
}

function buildMortalityTotalsBeforePeriod(
  mortalities: FlockMortality[],
  startDate: string,
): Map<string, number> {
  const totals = new Map<string, number>();

  mortalities.forEach((mortality) => {
    if (!mortality.flockId || mortality.date >= startDate) return;
    totals.set(mortality.flockId, (totals.get(mortality.flockId) ?? 0) + mortality.deadBirds);
  });

  return totals;
}

function buildMortalityTotalsByDate(
  mortalities: FlockMortality[],
  startDate: string,
  endDate: string,
): Map<string, Map<string, number>> {
  const totalsByDate = new Map<string, Map<string, number>>();

  mortalities.forEach((mortality) => {
    if (!mortality.flockId || mortality.date < startDate || mortality.date > endDate) return;
    const totalsByFlock = totalsByDate.get(mortality.date) ?? new Map<string, number>();
    totalsByFlock.set(mortality.flockId, (totalsByFlock.get(mortality.flockId) ?? 0) + mortality.deadBirds);
    totalsByDate.set(mortality.date, totalsByFlock);
  });

  return totalsByDate;
}

export function calculateEggProductionMetrics({
  flocks,
  mortalities,
  startDate,
  endDate,
  totalEggs,
}: EggProductionMetricInput): EggProductionMetrics {
  const periodStart = parseDate(startDate);
  const periodEnd = parseDate(endDate);
  if (periodEnd < periodStart) {
    throw new Error("A data final deve ser igual ou posterior à data inicial.");
  }

  const cumulativeDeaths = buildMortalityTotalsBeforePeriod(mortalities, startDate);
  const deathsByDate = buildMortalityTotalsByDate(mortalities, startDate, endDate);
  let eligibleBirdDays = 0;
  let exactEggGoal = 0;
  const dailyTargets: EggProductionDailyTarget[] = [];

  for (
    let currentDate = periodStart;
    currentDate <= periodEnd;
    currentDate = new Date(currentDate.getTime() + DAY_IN_MILLISECONDS)
  ) {
    const dateKey = formatDate(currentDate);
    deathsByDate.get(dateKey)?.forEach((deadBirds, flockId) => {
      cumulativeDeaths.set(flockId, (cumulativeDeaths.get(flockId) ?? 0) + deadBirds);
    });

    let dailyEligibleBirds = 0;
    let exactDailyEggGoal = 0;

    flocks.forEach((flock) => {
      const ageWeeks = getAgeAtDate(flock, currentDate);
      if (ageWeeks === undefined) return;

      const expectedRate = getExpectedLayingRate(ageWeeks);
      if (expectedRate === 0) return;

      const liveBirds = Math.max(flock.birdCount - (cumulativeDeaths.get(flock.id) ?? 0), 0);
      eligibleBirdDays += liveBirds;
      exactEggGoal += liveBirds * (expectedRate / 100);
      dailyEligibleBirds += liveBirds;
      exactDailyEggGoal += liveBirds * (expectedRate / 100);
    });

    dailyTargets.push({
      date: dateKey,
      eggGoal: Math.round(exactDailyEggGoal),
      layingRateGoal: dailyEligibleBirds > 0 ? (exactDailyEggGoal / dailyEligibleBirds) * 100 : 0,
      eligibleBirds: dailyEligibleBirds,
    });
  }

  return {
    eggGoal: Math.round(exactEggGoal),
    layingRate: eligibleBirdDays > 0 ? (totalEggs / eligibleBirdDays) * 100 : 0,
    layingRateGoal: eligibleBirdDays > 0 ? (exactEggGoal / eligibleBirdDays) * 100 : 0,
    eligibleBirdDays,
    dailyTargets,
  };
}
