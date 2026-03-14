export const mockFarm = {
  name: "Granja São Pedro",
  producer: "João Silva",
  totalBirds: 15000,
  activeBirds: 14997,
  barns: 3,
  breed: "Hy-Line Brown",
  productionSystem: "Convencional",
};

export const mockTodayProduction = {
  date: "2026-03-13",
  eggsProduced: 13200,
  brokenEggs: 45,
  dirtyEggs: 120,
  discardedEggs: 88,
  eggsSold: 12800,
  eggPrice: 0.45,
  layingRate: 88.0,
  eggsPerBird: 0.88,
};

export const mockTodayFeed = {
  quantity: 2250,
  cost: 1350,
  type: "Ração Postura",
  costPerEgg: 0.102,
};

export const mockTodayMortality = {
  dead: 3,
  rate: 0.02,
  cause: "Natural",
};

export const mockMonthFinancial = {
  revenue: 28800,
  expenses: 18500,
  profit: 10300,
  feedCost: 12000,
  laborCost: 3000,
  otherExpenses: 3500,
  revenueGoal: 32000,
};

export const mockTasks = [
  { id: 1, title: "Coletar ovos – Galpão 1", done: true, time: "06:00" },
  { id: 2, title: "Coletar ovos – Galpão 2", done: true, time: "06:30" },
  { id: 3, title: "Coletar ovos – Galpão 3", done: false, time: "07:00" },
  { id: 4, title: "Alimentar aves", done: true, time: "07:30" },
  { id: 5, title: "Limpeza dos bebedouros", done: false, time: "09:00" },
  { id: 6, title: "Inspeção sanitária", done: false, time: "10:00" },
];

export const mockAlerts = [
  {
    id: 1,
    type: "warning" as const,
    message: "Taxa de postura abaixo da média no Galpão 2",
    time: "08:15",
  },
  {
    id: 2,
    type: "info" as const,
    message: "Estoque de ração suficiente para 12 dias",
    time: "07:00",
  },
];

export const mockProductionTrend = [
  { day: "Seg", eggs: 13100, rate: 87.3 },
  { day: "Ter", eggs: 13350, rate: 89.0 },
  { day: "Qua", eggs: 13200, rate: 88.0 },
  { day: "Qui", eggs: 13050, rate: 87.0 },
  { day: "Sex", eggs: 13400, rate: 89.3 },
  { day: "Sáb", eggs: 13150, rate: 87.7 },
  { day: "Hoje", eggs: 13200, rate: 88.0 },
];

export const mockBarns = [
  { id: 1, name: "Galpão 1", birds: 5000, layingRate: 89.2, status: "ok" as const },
  { id: 2, name: "Galpão 2", birds: 4997, layingRate: 85.1, status: "warning" as const },
  { id: 3, name: "Galpão 3", birds: 5000, layingRate: 89.7, status: "ok" as const },
];
