import { describe, expect, test, beforeEach } from '@jest/globals';
import { fieldDoc, FieldDocument } from 'idai-field-core';
import { ResourcesStateManager } from '../../../../../src/app/components/resources/view/resources-state-manager';
import { ResourcesState } from '../../../../../src/app/components/resources/view/state/resources-state';


/**
 * @author Daniel de Oliveira
 */
describe('ResourcesStateManager', () => {

    let mockDatastore: any;
    let mockIndexFacade: any;
    let mockProjectConfiguration: any;

    const getCount = (constraintIndexName: string, matchTerm: string) => {
        return documents.map(document => document.resource.id)
            .find(id => id === matchTerm) ? 1 : 0
    };

    let resourcesStateManager: ResourcesStateManager;

    let documents: Array<FieldDocument>;
    let trenchDocument1: FieldDocument;


    beforeEach(() => {

        mockDatastore = {
            get: jest.fn().mockReturnValue({ resource: { identifier: 'test' } })
        };

        mockProjectConfiguration = {
            getCategoryForest: jest.fn(),
            getInventoryCategories: jest.fn().mockReturnValue([]),
            getCategoryWithSubcategories: jest.fn().mockReturnValue([{ name: 'Place' }])
        };
        
        mockIndexFacade = {
            getCount: jest.fn(getCount)
        };

        const mockSerializer: any = {
            store: jest.fn()
        };
        
        const mockTabManager: any = {
            openTab: jest.fn(),
            isOpen: jest.fn()
        };

        resourcesStateManager = new ResourcesStateManager(
            mockDatastore,
            mockIndexFacade,
            mockSerializer,
            mockTabManager,
            'test',
            mockProjectConfiguration,
            undefined
        );

        resourcesStateManager.loaded = true;

        trenchDocument1 = fieldDoc('trench1', 'trench1', 'Trench', 't1');
    });


    test('repair navigation path if a relation is changed', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        const featureDocument2 = fieldDoc('Feature 2', 'feature2', 'Feature', 'feature2');
        const findDocument1 = fieldDoc('Find 1', 'find1', 'Find', 'find1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        featureDocument2.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['liesWithin'] = [featureDocument1.resource.id];

        documents = [trenchDocument1, featureDocument1, featureDocument2, findDocument1];

        await resourcesStateManager.moveInto(featureDocument1);
        await resourcesStateManager.moveInto(findDocument1);

        findDocument1.resource.relations['liesWithin'] = [featureDocument2.resource.id];

        await resourcesStateManager.moveInto(featureDocument1);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId)
            .toEqual(featureDocument1.resource.id);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(1);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument1.resource.id);
    });


    test('updateNavigationPathForDocument', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        const featureDocument2 = fieldDoc('Feature 2', 'feature2', 'Feature', 'feature2');
        const findDocument1 = fieldDoc('Find 1', 'find1', 'Find', 'find1');
        const findDocument2 = fieldDoc('Find 2', 'find2', 'Find', 'find2');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        featureDocument2.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['liesWithin'] = [featureDocument1.resource.id];
        findDocument2.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument2.resource.relations['liesWithin'] = [featureDocument2.resource.id];

        documents = [trenchDocument1, featureDocument1, findDocument1];

        await resourcesStateManager.moveInto(featureDocument1);
        await resourcesStateManager.moveInto(findDocument1);
        await resourcesStateManager.moveInto(featureDocument1);

        mockDatastore.get.mockReturnValue(Promise.resolve(featureDocument2));

        await resourcesStateManager.updateNavigationPathForDocument(findDocument2);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId)
            .toEqual(featureDocument2.resource.id);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(1);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument2.resource.id);
    });


    test('updateNavigationPathForDocument - is correct navigation path', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        const featureDocument2 = fieldDoc('Feature 2', 'feature2', 'Feature', 'feature2');
        const findDocument1 = fieldDoc('Find 1', 'find1', 'Find', 'find1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        featureDocument2.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['liesWithin'] = [featureDocument1.resource.id];

        documents = [trenchDocument1, featureDocument1, findDocument1];

        await resourcesStateManager.moveInto(featureDocument1);
        await resourcesStateManager.moveInto(findDocument1);

        await resourcesStateManager.updateNavigationPathForDocument(featureDocument1);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId).toEqual(undefined);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(2);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument1.resource.id);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[1].document.resource.id)
            .toEqual(findDocument1.resource.id);
    });


    test('step into', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];

        documents = [trenchDocument1, featureDocument1];

        await resourcesStateManager.moveInto(featureDocument1);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId).toEqual(featureDocument1.resource.id);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(1);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument1.resource.id);
    });


    test('step out', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];

        documents = [trenchDocument1, featureDocument1];

        await resourcesStateManager.moveInto(featureDocument1);
        await resourcesStateManager.moveInto(undefined);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId).toEqual(undefined);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(1);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument1.resource.id);
    });


    test('repair navigation path if a document is deleted', async () => {

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        const findDocument1 = fieldDoc('Find 1', 'find1', 'Find', 'find1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];
        findDocument1.resource.relations['liesWithin'] = [featureDocument1.resource.id];

        documents = [trenchDocument1, featureDocument1, findDocument1];

        await resourcesStateManager.moveInto(featureDocument1);
        await resourcesStateManager.moveInto(findDocument1);
        await resourcesStateManager.moveInto(featureDocument1);

        documents.pop();

        await resourcesStateManager.moveInto(undefined);

        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).selectedSegmentId).toEqual(undefined);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments.length).toEqual(1);
        expect(ResourcesState.getNavigationPath(resourcesStateManager.get()).segments[0].document.resource.id)
            .toEqual(featureDocument1.resource.id);
    });


    test('set category filters and q', async () => {

        const trenchDocument1 = fieldDoc('trench1', 'trench1', 'Trench', 't1');
        const featureDocument1 = fieldDoc('Feature 1', 'feature1', 'Feature', 'feature1');
        featureDocument1.resource.relations['isRecordedIn'] = [trenchDocument1.resource.id];

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        resourcesStateManager.setCategoryFilters(['Find']);
        resourcesStateManager.setQueryString('abc');

        await resourcesStateManager.initialize('anotherOperationId');
        expect(ResourcesState.getCategoryFilters(resourcesStateManager.get())).toEqual([]);
        expect(ResourcesState.getQueryString(resourcesStateManager.get())).toEqual('');
        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        expect(ResourcesState.getCategoryFilters(resourcesStateManager.get())).toEqual(['Find']);
        expect(ResourcesState.getQueryString(resourcesStateManager.get())).toEqual('abc');
    });


    test('delete category filter and q of segment', async () => {

        const trenchDocument1 = fieldDoc('trench1', 'trench1', 'Trench', 't1');

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        resourcesStateManager.setCategoryFilters(undefined);
        resourcesStateManager.setQueryString('');
        expect(ResourcesState.getCategoryFilters(resourcesStateManager.get())).toEqual(undefined);
        expect(ResourcesState.getQueryString(resourcesStateManager.get())).toEqual('');
    });


    test('delete category filter and q of non segment', async () => {

        const trenchDocument1 = fieldDoc('trench1', 'trench1', 'Trench', 't1');

        await resourcesStateManager.initialize(trenchDocument1.resource.id);

        resourcesStateManager.setCategoryFilters(undefined);
        resourcesStateManager.setQueryString('');
        expect(ResourcesState.getCategoryFilters(resourcesStateManager.get())).toEqual(undefined);
        expect(ResourcesState.getQueryString(resourcesStateManager.get())).toEqual('');
    });
});
