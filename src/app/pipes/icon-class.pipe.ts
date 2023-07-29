import { Pipe, PipeTransform } from '@angular/core';

import { Material } from "../constants";
@Pipe({ name: 'iconClass' })
export class IconClassPipe implements PipeTransform {
    transform(value: Material) {
        return value;
    }
}
