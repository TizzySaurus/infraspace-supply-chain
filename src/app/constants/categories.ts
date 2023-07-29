import constructionCategories from '../../assets/config/constructionCategories.json';
import { hasKey } from '../types/utils';

type ConstructionCategories = typeof constructionCategories;

type Category = {
    categoryName: string;
    buttonsType: string;
    children: (Category | { itemName: string })[];
};

type ParsedCategoryValue = string | Record<Category['categoryName'], string[]>;
export type ParsedCategory = Record<Category['categoryName'], ParsedCategoryValue[]>;

function recurseConstructionCategory(category: Category) {
    const categoryItems: ParsedCategoryValue[] = [];
    for (const child of category.children) {
        if (hasKey(child, 'categoryName')) {
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

function parseCategories(categories: ConstructionCategories) {
    const parsedConstructionCategories: ParsedCategory = {};
    for (const rootCategory of categories['categories']) {
        parsedConstructionCategories[rootCategory.categoryName] = recurseConstructionCategory(rootCategory);
    }
    return parsedConstructionCategories;
}
export const parsedCategories = parseCategories(constructionCategories);
