import { Pipe, PipeTransform } from '@angular/core';

import { Material } from '../constants';

@Pipe({ name: 'iconClass' })
export class IconClassPipe implements PipeTransform {
    transform(value: Material) {
        switch (value) {
            case 'nanotubes':
                return 'nanoTubes';

            default:
                return value;
        }
    }
}
