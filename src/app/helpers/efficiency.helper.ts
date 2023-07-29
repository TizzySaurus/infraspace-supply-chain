import { Injectable } from '@morgan-stanley/needle';
import { Observable, Subject } from 'rxjs';

import { ParsedBuilding, factoryLookup } from "../constants";

@Injectable()
export class EfficiencyHelper {
    private _efficiencyLookup = new Map<ParsedBuilding, number>();

    private _updatesSubject = new Subject<ParsedBuilding>();

    public get efficiencyUpdates(): Observable<ParsedBuilding> {
        return this._updatesSubject.asObservable();
    }

    public get factories(): ParsedBuilding[] {
        const factorySet = Object.values(factoryLookup).reduce((factories, materialFactories) => {
            materialFactories.forEach(factory => factories.add(factory));
            return factories;
        }, new Set<ParsedBuilding>());

        return Array.from(factorySet).sort((one, two) => one.name.localeCompare(two.name));
    }

    public getEfficiency(factory: ParsedBuilding): number {
        return this._efficiencyLookup.get(factory) ?? 100;
    }

    public updateEfficiency(efficiency: number, factory: ParsedBuilding): void {
        this._efficiencyLookup.set(factory, efficiency);

        this._updatesSubject.next(factory);
    }
}
