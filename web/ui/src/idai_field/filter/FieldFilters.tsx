import React, { useState, useEffect, ReactElement } from 'react';
import { Dropdown, DropdownButton, Button, InputGroup, Form } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { Tree, Forest } from 'idai-field-core';
import { flatten } from 'tsfun';
import { ResultFilter, FilterBucket, FilterBucketTreeNode } from '../../api/result';
import { ProjectView } from '../project/Project';
import { buildParamsForFilterValue } from './utils';


export default function FieldFilters({ projectId, projectView, searchParams, filter }: { projectId: string,
    projectView: ProjectView, searchParams: URLSearchParams, filter: ResultFilter}): ReactElement {

    const history = useHistory();

    const [currentFilter, setCurrentFilter] = useState<string>('');
    const [currentFilterText, setCurrentFilterText] = useState<string>('');
    const [filters, setFilters] = useState<[string,string][]>([]);

    const fieldNames = getInputFieldNames(searchParams, filter);

    useEffect(() => {

        const params = searchParams
            .toString()
            .split('&')
            .filter(param => param.startsWith('resource.'))
            .map(param => param.replace('resource.', ''))
            .filter(param => !param.startsWith('category'))
            .map(param => param.split('='));
        setFilters(params as undefined as [string, string][]);

    }, [searchParams]);

    return (<>
        <ul>
            { filters.map(filter => <li key={ filter[0] }>{filter[0] + ':' + filter[1]}</li>)}
        </ul>
        <InputGroup>
            <DropdownButton
            id="basicbutton"
            title={ currentFilter !== '' ? currentFilter : 'Auswählen' }>
                {
                    fieldNames.map(fieldName =>
                        <Dropdown.Item key={ fieldName }
                                    active={ fieldName === currentFilter }
                                    onClick={ () => setCurrentFilter(fieldName) }>
                            { fieldName }
                        </Dropdown.Item>)
                }
            
            </DropdownButton>
            { currentFilter && <>
                <Form.Control aria-label="Text input with dropdown button"
                              onChange={ e => setCurrentFilterText(e.target.value) } />
                <Button onClick={ () => { setFilters(filters.concat([[currentFilter, currentFilterText]]));
                    history.push(`/project/${projectId}/${projectView}?`
                    + buildParamsForFilterValue(searchParams, 'resource.' + currentFilter, currentFilterText)); } }>
                        Add
                </Button>
            </>}
        </InputGroup>
    </>);
}


const getInputFieldNames = (searchParams: URLSearchParams, filter: ResultFilter) => {

    const filterBucket = findFilterBucket(searchParams.get('resource.category.name'), filter.values);
    if (!filterBucket) return [];
    
    const groups = filterBucket.value['groups'];
    if (!groups) return [];

    const fields = groups.map(group => group['fields']);

    return (flatten(fields) as unknown as { inputType: string, name: string }[])
        .filter(field => field.inputType === 'input')
        .map(field => field.name);
};


const findFilterBucket = (match: string, t: (FilterBucketTreeNode|FilterBucket)[]): FilterBucket|undefined => {

    const result: FilterBucketTreeNode = Tree.find(t as undefined as Forest<FilterBucket>,
        item => item.value.name === match );
    return result ? result.item : undefined;
};
