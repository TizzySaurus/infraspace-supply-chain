import buildings from "../../assets/config/buildings.json" assert { type: "json" };
import constructionCategories from "../../assets/config/constructionCategories.json" assert { type: "json" };

const hasKey = <o, k extends string>(o: o, k: k): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k];
    return valueAtKey !== undefined && valueAtKey !== null;
};

type evaluate<t> = { [k in keyof t]: t[k] } & unknown;
export type List<t = unknown> = readonly t[];
export type entryOf<o> = evaluate<
    { [k in keyof o]-?: [k, Exclude<o[k], undefined>] }[o extends List ? keyof o & number : keyof o]
>;
export type entriesOf<o extends object> = entryOf<o>[];
export const entriesOf = <o extends object>(o: o) => Object.entries(o) as entriesOf<o>;

type Category = {
    categoryName: string;
    buttonsType: string;
    children: (Category | { itemName: string })[];
};

type ParsedCategoryValue = string | Record<Category["categoryName"], string[]>;
type ParsedCategory = Record<Category["categoryName"], ParsedCategoryValue[]>;

const parsedConstructionCategories: ParsedCategory = {};
function recurseConstructionCategory(category: Category) {
    const categoryItems: ParsedCategoryValue[] = [];
    for (const child of category.children) {
        if (hasKey(child, "categoryName")) {
            // Is a sub-category
            categoryItems.push({
                [child.categoryName]: recurseConstructionCategory(child) as string[],
            });
        } else {
            categoryItems.push(child.itemName);
        }
    }
    return categoryItems;
}

for (const rootCategory of constructionCategories["categories"]) {
    parsedConstructionCategories[rootCategory.categoryName] =
        recurseConstructionCategory(rootCategory);
}

type Building = typeof buildings[BuildingName];

type ParsedBuildingItemQuantity = Record<string, number>;
type ParsedBuilding = {
    name: string;
    buildCost: ParsedBuildingItemQuantity;
    categoryPath: string[] | null;
    duration: number;
    input: ParsedBuildingItemQuantity;
    output: ParsedBuildingItemQuantity;
    power: number;
    workers: number;
};

type BuildingName = keyof typeof buildings;
type Buildings = {
    [buildingName in BuildingName]: Building;
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
        parsedCostsForBuilding[cost["resourceName"]] = cost["amount"];
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

function getOutputFromRawBuilding(rawBuilding: Building) {
    const outputs: ParsedBuilding["output"] = {};

    const producables = getProducablesOfRawBuilding(rawBuilding);
    for (const producable of producables) {
        outputs[producable.resourceName] = producable.amount;
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

function parseRawBuilding(buildingName: BuildingName, rawBuilding: Building) {
    const categoryPath = getCategoryPath(parsedConstructionCategories, buildingName);
    const duration = getDurationFromRawBuilding(rawBuilding);
    const maxWorkers = getMaxWorkersFromRawBuilding(rawBuilding);
    const parsedCosts = rawCostsToParsedCosts(rawBuilding);
    const parsedInput = getInputFromRawBuilding(rawBuilding);
    const parsedOutput = getOutputFromRawBuilding(rawBuilding);
    const power = getPowerFromRawBuilding(rawBuilding);
    return { categoryPath, duration, maxWorkers, parsedCosts, parsedInput, parsedOutput, power };
}

function parseBuilding(buildings: Buildings) {
    const parsedBuildings: Record<string, ParsedBuilding> = {};

    for (const [buildingName, rawBuilding] of entriesOf(buildings)) {
        const {
            categoryPath,
            duration,
            maxWorkers: workers,
            parsedCosts: buildCost,
            parsedInput: input,
            parsedOutput: output,
            power,
        } = parseRawBuilding(buildingName, rawBuilding);

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
    return parsedBuildings;
}

const parsedBuildings: Record<string, ParsedBuilding> = parseBuilding(buildings);
console.log(parsedBuildings);
