import { buildings } from "../../assets/config/buildings";
import { DeepWriteable, entriesOf, hasKey, objectKeysOf, unionToTuple } from "../types/utils";
import { parsedCategories, ParsedCategory } from "./categories";

export type Material = Extract<
    Extract<Building, { productionLogic: any }>["productionLogic"],
    { productionDefinition: any }
>["productionDefinition"]["producables"][number]["resourceName"];

type Buildings = typeof buildings;
type BuildingName = keyof Buildings;
type Building = Buildings[keyof Buildings];

type MaterialsOf<building extends Building> = building extends {
    productionLogic: {
        productionDefinition: {
            producables: readonly { resourceName: infer resourceName }[];
        };
    };
}
    ? string extends resourceName
        ? never
        : resourceName
    : never;

type MaterialsToProducerNames = {
    [K in keyof Buildings as MaterialsOf<Buildings[K]>]: unionToTuple<K>;
};

type ParsedBuildingItemQuantity = Partial<Record<Material, number>>;

export type ParsedBuilding = {
    name: string;
    buildCost: ParsedBuildingItemQuantity;
    categoryPath: string[] | null;
    duration: number;
    input: ParsedBuildingItemQuantity;
    output: ParsedBuildingItemQuantity;
    power: number;
    workers: number;
};

function getCategoryPath(categories: ParsedCategory, target: string): string[] | null {
    for (const [categoryName, categoryChildren] of Object.entries(categories)) {
        for (const child of categoryChildren) {
            if (typeof child === "string") {
                if (child === target) {
                    return [categoryName];
                }
                continue;
            }
            let path = getCategoryPath(child, target);
            if (path !== null) {
                return [categoryName, ...path];
            }
        }
    }
    return null;
}

function rawCostsToParsedCosts(rawBuilding: Building): ParsedBuilding["buildCost"] {
    if (!hasKey(rawBuilding, "costs")) return {};

    const parsedCostsForBuilding: ParsedBuilding["buildCost"] = {};
    for (const cost of rawBuilding.costs) {
        parsedCostsForBuilding[cost.resourceName] = cost.amount;
    }
    return parsedCostsForBuilding;
}

function getMaxWorkersFromRawBuilding(rawBuilding: Building) {
    if (!hasKey(rawBuilding, "productionLogic")) return 0;

    if (hasKey(rawBuilding.productionLogic, "productionDefinition"))
        return rawBuilding.productionLogic.productionDefinition.maxWorkers;

    if (hasKey(rawBuilding.productionLogic, "maxInhabitants"))
        return rawBuilding.productionLogic.maxInhabitants;
    return 0;
}

function getConsumablesOfRawBuilding(rawBuilding: Building) {
    if (
        !hasKey(rawBuilding, "productionLogic") ||
        !hasKey(rawBuilding.productionLogic, "productionDefinition")
    )
        return [];
    return rawBuilding.productionLogic.productionDefinition.consumables;
}

function getPowerFromRawBuilding(rawBuilding: Building) {
    if (!hasKey(rawBuilding, "productionLogic")) return 0;

    if (hasKey(rawBuilding.productionLogic, "powerNeeded"))
        return rawBuilding.productionLogic.powerNeeded;

    if (hasKey(rawBuilding.productionLogic, "powerNeededForTenPeople")) {
        return rawBuilding.productionLogic.powerNeededForTenPeople;
    }

    if (
        !hasKey(rawBuilding.productionLogic, "productionDefinition") ||
        !hasKey(rawBuilding.productionLogic.productionDefinition, "powerNeeded")
    ) {
        return 0;
    }
    return rawBuilding.productionLogic.productionDefinition.powerNeeded;
}

function getInputFromRawBuilding(rawBuilding: Building) {
    const parsedInput: ParsedBuilding["input"] = {};

    const consumables = getConsumablesOfRawBuilding(rawBuilding);
    if (consumables.length === 0) return parsedInput;
    if (typeof consumables[0] === "string") return parsedInput; // TODO: Decide what should be returned as input for storage houses
    for (const consumable of consumables) {
        parsedInput[consumable.resourceName] = consumable.amount;
    }
    return parsedInput;
}

function getProducablesOfRawBuilding(rawBuilding: Building) {
    if (
        !hasKey(rawBuilding, "productionLogic") ||
        !hasKey(rawBuilding.productionLogic, "productionDefinition")
    )
        return [];
    return rawBuilding.productionLogic.productionDefinition.producables;
}

function getOutputFromRawBuilding(
    rawBuilding: Building,
    buildingName: BuildingName,
    tmpMaterialsToProducers: Partial<DeepWriteable<MaterialsToProducerNames>>
) {
    const outputs: ParsedBuilding["output"] = {};

    const producables = getProducablesOfRawBuilding(rawBuilding);
    for (const producable of producables) {
        outputs[producable.resourceName] = producable.amount;
        if (tmpMaterialsToProducers[producable.resourceName] === undefined)
            (tmpMaterialsToProducers[producable.resourceName] as BuildingName[]) = [
                buildingName as never,
            ];
        else
            (
                tmpMaterialsToProducers[
                    producable.resourceName
                ] as MaterialsToProducerNames[Material]
            ).push(buildingName as never);
    }
    return outputs;
}

function getDurationFromRawBuilding(rawBuilding: Building) {
    if (
        !hasKey(rawBuilding, "productionLogic") ||
        !hasKey(rawBuilding.productionLogic, "productionDefinition")
    )
        return 0;
    return rawBuilding.productionLogic.productionDefinition.timeSteps / 5000;
}

function parseRawBuilding(
    buildingName: BuildingName,
    rawBuilding: Building,
    tmpMaterialsToProducers: Partial<MaterialsToProducerNames>
) {
    const categoryPath = getCategoryPath(parsedCategories, buildingName);
    const duration = getDurationFromRawBuilding(rawBuilding);
    const maxWorkers = getMaxWorkersFromRawBuilding(rawBuilding);
    const parsedCosts = rawCostsToParsedCosts(rawBuilding);
    const parsedInput = getInputFromRawBuilding(rawBuilding);
    const parsedOutput = getOutputFromRawBuilding(
        rawBuilding,
        buildingName,
        tmpMaterialsToProducers
    );
    const power = getPowerFromRawBuilding(rawBuilding);
    return { categoryPath, duration, maxWorkers, parsedCosts, parsedInput, parsedOutput, power };
}

function parseBuildings(buildings: Buildings) {
    const parsedBuildings: Record<string, ParsedBuilding> = {};
    const tmpMaterialsToProducers: Partial<MaterialsToProducerNames> = {};

    for (const [buildingName, rawBuilding] of entriesOf(buildings)) {
        const {
            categoryPath,
            duration,
            maxWorkers: workers,
            parsedCosts: buildCost,
            parsedInput: input,
            parsedOutput: output,
            power,
        } = parseRawBuilding(buildingName, rawBuilding, tmpMaterialsToProducers);

        parsedBuildings[buildingName] = {
            name: buildingName,
            buildCost,
            categoryPath,
            duration,
            input,
            output,
            power,
            workers,
        };
    }
    return {
        materialsToProducers: tmpMaterialsToProducers as MaterialsToProducerNames,
        parsedBuildings,
    };
}

export const { materialsToProducers, parsedBuildings } = parseBuildings(buildings);

export type Materials = keyof MaterialsToProducerNames;
export const materials = objectKeysOf(materialsToProducers) as Materials[];
