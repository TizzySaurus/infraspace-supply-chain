import constructionCategories from '../../assets/config/constructionCategories.json' assert { type: 'json' };

const hasKey = <o, k extends string>(
    o: o,
    k: k
): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k]
    return valueAtKey !== undefined && valueAtKey !== null
}

type Category = {
    categoryName: string,
    buttonsType: string,
    children: Category[] | {itemName: string}[]
}

type ParsedCategory = (string | Record<Category["categoryName"], string[]>)[]
const parsedConstructionCategories: Record<Category["categoryName"], ParsedCategory> = {};
function recurseConstructionCategory(category: Category) {
    const categoryItems: (string | Record<Category["categoryName"], string[]>)[] = []
    for (const child of category.children) {
        if (hasKey(child, "categoryName")) {
            // Is a sub-category
            categoryItems.push({[child.categoryName]: recurseConstructionCategory(child) as string[]})
        } else {
            categoryItems.push(child.itemName);
        }
    }
    return categoryItems
}

for (const rootCategory of constructionCategories["categories"]) {
    parsedConstructionCategories[rootCategory.categoryName] = recurseConstructionCategory(rootCategory as Category);
}
console.log(JSON.stringify(parsedConstructionCategories, null, 2));