import React, { useState, useEffect, ReactElement } from 'react';
import { Dropdown, DropdownButton, Button, InputGroup, Form } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { Tree, Forest } from 'idai-field-core';
import { flatten } from 'tsfun';
import { ResultFilter, FilterBucket, FilterBucketTreeNode } from '../../api/result';
import { ProjectView } from '../project/Project';
import { buildParamsForFilterValue } from './utils';
import { getTranslation } from '../../shared/languages';

// TODO review all occurences of 'resource.' replacements

export default function FieldFilters({ projectId, projectView, searchParams, filter }: { projectId: string,
    projectView: ProjectView, searchParams: URLSearchParams, filter: ResultFilter}): ReactElement {

    const history = useHistory();
    const navigateTo = (k: string, v: string) => history.push(`/project/${projectId}/${projectView}?`
        + buildParamsForFilterValue(searchParams, 'resource.' + k, v));

    const [currentFilter, setCurrentFilter] = useState<string>('');
    const [currentFilterText, setCurrentFilterText] = useState<string>('');
    const [filters, setFilters] = useState<[string,string][]>([]);

    const [fields, dropdownMap] = getFields(searchParams, filter);

    useEffect(() => {
        setFilters(extractFiltersFromSearchParams(searchParams));
    }, [searchParams]);

    return (<>
        <ExistingFilters filters={ filters } setFilters={ setFilters } navigateTo={ navigateTo } />
        <InputGroup>
            <DropdownButton
                id="basicbutton"
                title={ currentFilter !== '' 
                    ? currentFilter /* TODO i18n */
                    : 'Auswählen' /* TODO i18n */ }>

                    <DropdownItems
                        fields={ fields }
                        searchParams={ searchParams }
                        currentFilter={ currentFilter }
                        setCurrentFilter={ setCurrentFilter } />
            </DropdownButton>
            { currentFilter && <>
                { dropdownMap[currentFilter]
                    ? <div>TODO show dropdown</div>
                    : <Form.Control aria-label="Text input with dropdown button"
                    onChange={ e => setCurrentFilterText(e.target.value) } /> }
                <Button onClick={ () => { setFilters(filters.concat([[currentFilter, currentFilterText]]));
                    navigateTo(currentFilter, currentFilterText); } }>
                        Add
                </Button>
            </>}
        </InputGroup>
    </>);
}


function ExistingFilters({ filters, setFilters, navigateTo }: { filters: [string, string][],
    setFilters: React.Dispatch<React.SetStateAction<[string, string][]>>,
    navigateTo: (k: string, v: string) => void }) {

    return <ul>
            { filters.map(filter => <li
                    key={ filter[0] }
                    onClick={ () => {
                        setFilters(filters.filter(f => filter[0] !== f[0]));
                        navigateTo(filter[0], filter[1]);
                    } }>
                {filter[0] + ':' + filter[1]}
            </li>)}
   </ul>;
}


function DropdownItems({ fields, searchParams, currentFilter, setCurrentFilter }: { fields: unknown[],
    searchParams: URLSearchParams, currentFilter: string,
    setCurrentFilter: React.Dispatch<React.SetStateAction<string>> }) {

    return <>{ fields
        .filter(field => !searchParams.has('resource.' + field['name']))
        .map(field =>
            <Dropdown.Item key={ field['name'] }
                        active={ field['name'] === currentFilter }
                        onClick={ () => setCurrentFilter(field['name']) }>
                { getTranslation(field['label']) }
            </Dropdown.Item>)
    }</>;
}


const extractFiltersFromSearchParams = (searchParams: URLSearchParams) =>
    searchParams
        .toString()
        .split('&')
        .filter(param => param.startsWith('resource.'))
        .map(param => param.replace('resource.', ''))
        .filter(param => !param.startsWith('category'))
        .map(param => param.split('=')) as undefined as [string, string][];


const getFields = (searchParams: URLSearchParams, filter: ResultFilter): [unknown[], unknown] => {

    const filterBucket = findFilterBucket(searchParams.get('resource.category.name'), filter.values);
    if (!filterBucket) return [[], {}];
    
    const groups = filterBucket.value['groups'];
    if (!groups) return [[], {}];

    const fields = flatten(groups.map(group => group['fields'])) as unknown as { inputType: string, name: string }[];

    const dropdownMap = {};
    fields
        .filter(field => field.inputType === 'dropdown')
        .map(field => [field.name, field['valuelist']])
        .forEach(([fieldName, valuelist]: [string, unknown]) => dropdownMap[fieldName] = valuelist);

    const fields_ = fields
        .filter(field => field.inputType === 'input' || field.inputType === 'dropdown')

    return [fields_, dropdownMap];
};


const findFilterBucket = (match: string, t: (FilterBucketTreeNode|FilterBucket)[]): FilterBucket|undefined => {

    const result: FilterBucketTreeNode = Tree.find(t as undefined as Forest<FilterBucket>,
        item => item.value.name === match );
    return result ? result.item : undefined;
};
