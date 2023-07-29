import { Material, materialsToProducers, ParsedBuilding, parsedBuildings } from "./buildings";
import { transform } from "../types/utils";

export const factoryLookup = transform(materialsToProducers, ([material, producerNames]) => [
    material,
    producerNames.map(producerName => parsedBuildings[producerName]),
]);
export type MaterialsToProducers = typeof factoryLookup;
export type FactoryTotals = Map<ParsedBuilding, Partial<Record<Material, number>>>;
