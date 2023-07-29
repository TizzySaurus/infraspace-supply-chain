import { factoryLookup, Material, ParsedBuilding } from '../constants';

export function getFactories<T extends Material>(material: T): [ParsedBuilding, ...ParsedBuilding[]] {
    return factoryLookup[material] as [ParsedBuilding, ...ParsedBuilding[]];
}

export function getRate(
    material: Material,
    materialCost: number,
    duration: number,
    factoryCount = 1,
    efficiency = 100
): number {
    let factoryRate: number;

    switch (material) {
        default:
            factoryRate = (60 / duration) * materialCost * (efficiency / 100);
    }

    return factoryRate * factoryCount;
}
