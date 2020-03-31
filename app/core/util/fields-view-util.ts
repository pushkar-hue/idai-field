import {Resource} from 'idai-components-2/index';
import {Name} from '../constants';
import {ValuelistDefinition} from '../configuration/model/valuelist-definition';
import {ValuelistUtil} from './valuelist-util';
import {assoc, compose, flow, includedIn, isNot, isString, lookup, map, Map, on, to, undefinedOrEmpty} from 'tsfun';
import {RelationDefinition} from '../configuration/model/relation-definition';
import {HierarchicalRelations} from '../model/relation-constants';
import {Named} from './named';
import {Category} from '../configuration/model/category';
import {Group, Groups} from '../configuration/model/group';


export interface FieldsViewGroupDefinition extends Group {

    shown: boolean;
    _relations: Array<FieldsViewRelationDefinition>;
}


export interface FieldsViewRelationDefinition {

}


module FieldsViewGroupDefinition {

    export const SHOWN = 'shown';
    export const _RELATIONS = '_relations';
}


/**
 * @author Thomas Kleinke
 * @author Sebastian Cuy
 * @author Daniel de Oliveira
 */
export module FieldsViewUtil {

    export function getValue(resource: Resource, field: Name, valuelist?: ValuelistDefinition): any {

        return valuelist
            ? ValuelistUtil.getValueLabel(valuelist, resource[field])
            : isString(resource[field])
                ? resource[field]
                    .replace(/^\s+|\s+$/g, '')
                    .replace(/\n/g, '<br>')
                : resource[field];
    }


    export function computeRelationsToShow(resource: Resource,
            relations: Array<RelationDefinition>): Array<RelationDefinition> {

            const isNotHierarchical = isNot(includedIn(HierarchicalRelations.ALL));
        const hasTargets = compose(lookup(resource.relations), isNot(undefinedOrEmpty));

        return relations
            .filter(on(Named.NAME, isNotHierarchical))
            .filter(on(Named.NAME, hasTargets));
    }


    export function getGroups(category: string, categories: Map<Category>) {

        return flow(category,
            lookup(categories),
            to(Category.GROUPS),
            map(group =>
                assoc<any>(
                    FieldsViewGroupDefinition.SHOWN,
                    group.name === Groups.STEM)(group)
            ),
            map(group =>
                assoc<any>(
                    FieldsViewGroupDefinition._RELATIONS,
                    [])(group)
            )) as Array<FieldsViewGroupDefinition>;
    }
}