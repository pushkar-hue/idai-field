import { clone, compose, cond, copy, detach, filter, flow, identity, includedIn, isDefined, isNot,
    keysValues, Map, map, Mapping, on, or, Pair, pairWith, reduce, subtract,
    update, update as updateStruct, assoc, isUndefinedOrEmpty, not } from 'tsfun';
import { RelationDefinition,CategoryDefinition,Category,Groups,Group,FieldDefinition } from '../../model';
import { ValuelistDefinition } from '../../model/valuelist-definition';
import { Forest,Tree, Labeled, withDissoc, sortStructArray } from '../../tools';
import { linkParentAndChildInstances } from '../category-forest';
import { BuiltinCategoryDefinition } from '../model/builtin-category-definition';
import { CustomCategoryDefinition } from '../model/custom-category-definition';
import { LanguageConfiguration } from '../model/language-configuration';
import { LanguageConfigurations } from '../model/language-configurations';
import { LibraryCategoryDefinition } from '../model/library-category-definition';
import { TransientCategoryDefinition, TransientFieldDefinition } from '../model/transient-category-definition';
import { ProjectCategories } from '../project-categories';
import { RawProjectConfiguration } from '../project-configuration';
import { RelationsUtil } from '../relations-utils';
import { addExtraFields } from './add-extra-fields';
import { addRelations } from './add-relations';
import { addSourceField } from './add-source-field';
import { applyLanguageConfigurations } from './apply-language-configurations';
import { applySearchConfiguration } from './apply-search-configuration';
import { Assertions } from './assertions';
import { ConfigurationErrors } from './configuration-errors';
import { getDefinedParents, iterateOverFieldsOfCategories } from './helpers';
import { hideFields } from './hide-fields';
import { makeCategoryForest } from './make-category-forest';
import { mergeBuiltInWithLibraryCategories } from './merge-builtin-with-library-categories';
import { mergeCategories } from './merge-categories';


const CATEGORIES = 0;


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export function buildRawProjectConfiguration(builtInCategories: Map<BuiltinCategoryDefinition>,
                                             libraryCategories: Map<LibraryCategoryDefinition>,
                                             customCategories: Map<CustomCategoryDefinition> = {},
                                             commonFields: Map<any> = {},
                                             valuelistsConfiguration: Map<ValuelistDefinition> = {},
                                             extraFields: Map<any> = {},
                                             relations: Array<RelationDefinition> = [],
                                             languageConfigurations: LanguageConfigurations = { default: {}, complete: {} },
                                             searchConfiguration: any = {},
                                             categoriesOrder: string[] = [],
                                             validateFields: any = identity): RawProjectConfiguration {

    Assertions.performAssertions(builtInCategories, libraryCategories, customCategories, commonFields, valuelistsConfiguration);
    addSourceField(builtInCategories, libraryCategories, customCategories, commonFields);

    return flow(
        mergeBuiltInWithLibraryCategories(builtInCategories, libraryCategories),
        Assertions.assertInputTypesAreSet(Assertions.assertInputTypePresentIfNotCommonField(commonFields)),
        Assertions.assertNoDuplicationInSelection(customCategories),
        mergeCategories(customCategories, Assertions.assertInputTypePresentIfNotCommonField(commonFields)),
        eraseUnusedCategories(Object.keys(customCategories)),
        replaceCommonFields(commonFields),
        insertValuelistIds,
        Assertions.assertValuelistIdsProvided,
        hideFields(customCategories),
        toCategoriesByFamilyNames,
        replaceValuelistIdsWithValuelists(valuelistsConfiguration),
        addExtraFields(extraFields),
        prepareRawProjectConfiguration,
        addRelations(relations),
        applyLanguageConfigurations(languageConfigurations),
        updateStruct(CATEGORIES,
            processCategories(validateFields, languageConfigurations, searchConfiguration, categoriesOrder, relations)
        )
    );
}


const prepareRawProjectConfiguration = (configuration: Map<TransientCategoryDefinition>) => [configuration, [] /* relations */];


function processCategories(validateFields: any,
                           languageConfigurations: LanguageConfigurations,
                           searchConfiguration: any,
                           categoriesOrder: string[],
                           relations: Array<RelationDefinition>): Mapping<Map<CategoryDefinition>, Forest<Category>> {

    return compose(
        setCategoryNames,
        applySearchConfiguration(searchConfiguration),
        validateFields,
        makeCategoryForest,
        Tree.mapList(putRelationsIntoGroups(relations)),
        Tree.mapList(setGroupLabels(languageConfigurations)),
        setGeometriesInGroups(languageConfigurations),
        orderCategories(categoriesOrder),
        linkParentAndChildInstances
    );
}


function setCategoryNames(categories: Map<CategoryDefinition>): Map<CategoryDefinition> {

    Object.keys(categories).forEach(categoryName => {
        categories[categoryName].name = categoryName;
    });

    return categories;
}


const setGeometriesInGroups = (languageConfigurations: LanguageConfigurations) => (categoriesTree: Forest<Category>) =>
    Tree.mapList(adjustCategoryGeometry(languageConfigurations, categoriesTree), categoriesTree);


function adjustCategoryGeometry(languageConfigurations: LanguageConfigurations,
                                categoriesTree: Forest<Category>) {

    return (category: Category /* modified in place */): Category => {

        if (!ProjectCategories.isGeometryCategory(categoriesTree, category.name)) return category;

        let positionGroup = category.groups.find(group => group.name === Groups.POSITION);
        if (!positionGroup) {
            positionGroup = Group.create(Groups.POSITION);
            positionGroup.label = LanguageConfiguration.getI18nString(
                languageConfigurations.complete, 'groups', 'position'
            );
            category.groups.push(positionGroup);
        }

        const geometryField: FieldDefinition = {
            name: 'geometry',
            label: LanguageConfiguration.getI18nString(
                languageConfigurations.complete, 'other', 'geometry'
            ),
            defaultLabel: LanguageConfiguration.getI18nString(
                languageConfigurations.default, 'other', 'geometry'
            ),
            inputType: 'geometry',
            editable: true
        };
        positionGroup.fields.unshift(geometryField);

        return category;
    }
}


function putRelationsIntoGroups(relations: Array<RelationDefinition>) {

    return (category: Category /* modified in place */): Category => {

        const relDefs = RelationsUtil.getRelationDefinitions(relations, category.name);

        for (let relation of relDefs) {
            const groupName: string|undefined = Groups.getGroupNameForRelation(relation.name);
            if (!groupName) continue;

            let group = category.groups.find(group => group.name === groupName);
            if (!group) {
                group = Group.create(groupName);
                category.groups.push(group);
            }
            group.relations.push(relation);
        }
        return category;
    }
}


const orderCategories = (categoriesOrder: string[] = []) => (categories: Forest<Category>): Forest<Category> =>
    Tree.mapTrees(sortStructArray(categoriesOrder, Tree.ITEMNAMEPATH), categories) as Forest<Category>;


function setGroupLabels(languageConfigurations: LanguageConfigurations) {

    return (category: Category) => {

        const groupLabel = ({ name: name }: Group) => {

            if (name === Groups.PARENT) {
                return category.parentCategory
                    ? category.parentCategory.label
                    : category.label;
            } else if (name === Groups.CHILD) {
                return category.label;
            } else {
                return LanguageConfiguration.getI18nString(
                    languageConfigurations.complete, 'groups', name
                );
            }
        };

        return update(
            Category.GROUPS,
            compose(
                map(pairWith(groupLabel)),
                map(([group, label]: Pair<Group, string>) => assoc(Labeled.LABEL, label)(group as any))))(category);
    };
}


function insertValuelistIds(mergedCategories: Map<TransientCategoryDefinition>) {

    iterateOverFieldsOfCategories(mergedCategories,
        (categoryName, category, fieldName, field) => {

        if (category.valuelists && category.valuelists[fieldName]) {
            field.valuelistId = category.valuelists[fieldName];
        }
        if (category.positionValuelists && category.positionValuelists[fieldName]) {
            field.positionValuelistId = category.positionValuelists[fieldName];
        }
    });

    return mergedCategories;
}


function replaceValuelistIdsWithValuelists(valuelistDefinitionsMap: Map<ValuelistDefinition>)
    : Mapping<Map<TransientCategoryDefinition>> {

    return map(
        cond(
            on(TransientCategoryDefinition.FIELDS, not(isUndefinedOrEmpty)),
            assoc(TransientCategoryDefinition.FIELDS,
                map(
                    cond(
                        or(
                            on(TransientFieldDefinition.VALUELISTID, isDefined),
                            on(TransientFieldDefinition.POSITION_VALUELIST_ID, isDefined)
                        ),
                        replaceValuelistIdWithActualValuelist(valuelistDefinitionsMap)))))) as any;
}


function replaceValuelistIdWithActualValuelist(valuelistDefinitionMap: Map<ValuelistDefinition>) {

    return (fd: TransientFieldDefinition) =>
        flow(fd,
            assoc(TransientFieldDefinition.VALUELIST, valuelistDefinitionMap[fd.valuelistId!]),
            assoc(TransientFieldDefinition.POSITION_VALUES, valuelistDefinitionMap[fd.positionValuelistId!]),
            detach(TransientFieldDefinition.VALUELISTID),
            detach(TransientFieldDefinition.POSITION_VALUELIST_ID)
        );
}


function eraseUnusedCategories(selectedCategoriesNames: string[])
    : Mapping<Map<TransientCategoryDefinition>> {

    return (categories: Map<TransientCategoryDefinition>) => {

        const keysOfUnselectedCategories =
            flow(
                categories,
                Object.keys,
                filter(isNot(includedIn(selectedCategoriesNames)))
            );

        const parentNamesOfSelectedCategories: string[] = flow(
            keysOfUnselectedCategories,
            reduce(withDissoc, categories),
            getDefinedParents
        );

        const categoriesToErase = subtract(parentNamesOfSelectedCategories)(keysOfUnselectedCategories);
        return categoriesToErase.reduce(withDissoc, categories) as Map<TransientCategoryDefinition>;
    }
}


function replaceCommonFields(commonFields: Map<any>)
        : Mapping<Map<TransientCategoryDefinition>> {

    return map(
        cond(
            on(TransientCategoryDefinition.COMMONS, isDefined),
            (mergedCategory: TransientCategoryDefinition) => {

                const clonedMergedCategory: any = clone(mergedCategory);
                for (let commonFieldName of clonedMergedCategory.commons) {
                    if (!commonFields[commonFieldName]) {
                        throw [ConfigurationErrors.COMMON_FIELD_NOT_PROVIDED, commonFieldName];
                    }

                    if (!clonedMergedCategory.fields[commonFieldName]) {
                        clonedMergedCategory.fields[commonFieldName] = {};
                    }

                    clonedMergedCategory.fields[commonFieldName] = copy(commonFields[commonFieldName]) as any;
                }
                delete clonedMergedCategory.commons;
                return clonedMergedCategory;
            })) as any;
}


function toCategoriesByFamilyNames(transientCategories: Map<TransientCategoryDefinition>)
        : Map<TransientCategoryDefinition> {

    return flow(
        transientCategories,
        keysValues,
        reduce(
            (acc: any, [transientCategoryName, transientCategory]) => {
                acc[transientCategory.categoryName
                    ? transientCategory.categoryName
                    : transientCategoryName] = transientCategory;
                return acc;
            }, {}));
}
