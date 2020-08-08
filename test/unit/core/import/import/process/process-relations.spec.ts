import {processRelations} from '../../../../../../src/app/core/import/import/process/process-relations';
import {HierarchicalRelations} from '../../../../../../src/app/core/model/relation-constants';
import LIES_WITHIN = HierarchicalRelations.LIESWITHIN;
import RECORDED_IN = HierarchicalRelations.RECORDEDIN;
import {createMockValidator, d} from '../helper';


describe('processRelations', () => {

    let operationCategoryNames = ['Trench'];

    let validator;

    const existingFeature = {resource: { category: 'Feature', identifier: 'existingFeature', id: 'ef1', relations: { isRecordedIn: ['et1'] } } };
    const existingFeature2 = {resource: { category: 'Feature', identifier: 'existingFeature2', id: 'ef2', relations :{ isRecordedIn: ['et2'] } } };


    const relationInverses = { isAfter: 'isBefore' };


    let get = async (resourceId): Promise<any> => {

        if (resourceId === 'et1') return d('et1', 'Trench', 'ExistingTrench1');
        if (resourceId === 'ef1') return existingFeature;
        if (resourceId === 'ef2') return existingFeature2;
        throw 'missing';
    };

    let resourceIdCounter;

    beforeEach(() => {

        resourceIdCounter = 0;
        validator = createMockValidator();
    });


    it('convert LIES_WITHIN targeting existing operation to RECORDED_IN', async done => {

        const documents = [
            d('nf1', 'Feature', 'NewFeature1', { liesWithin: ['et1'] }),
        ];

        await processRelations(
            documents,
            validator,
            ['Trench'], get, relationInverses, {});

        expect(documents[0].resource.relations[LIES_WITHIN]).toBeUndefined();
        expect(documents[0].resource.relations[RECORDED_IN]).toEqual(['et1']);
        done();
    });


    it('convert LIES_WITHIN targeting new operation to RECORDED_IN', async done => {

        const documents = [
            d('nt1', 'Trench', 'NewTrench1', {}),
            d('nf1', 'Feature', 'NewFeature1', { liesWithin: ['nt1'] }),
        ];

        await processRelations(
            documents,
            validator,
            ['Trench'], get, relationInverses, {});

        expect(documents[1].resource.identifier).toBe('NewFeature1');
        expect(documents[1].resource.relations[LIES_WITHIN]).toBeUndefined();
        expect(documents[1].resource.relations[RECORDED_IN]).toEqual(['nt1']);
        done();
    });


    it('do not convert LIES_WITHIN targeting new place to RECORDED_IN', async done => {

        const documents = [
            d('np1', 'Place', 'NewPlace1', {}),
            d('nt1', 'Trench', 'NewTrench1', { liesWithin: ['np1'] }),
        ];

        await processRelations(
            documents,
            validator,
            ['Trench'], get, relationInverses, {});

        expect(documents[1].resource.identifier).toBe('NewTrench1');
        expect(documents[1].resource.relations[RECORDED_IN]).toBeUndefined();
        expect(documents[1].resource.relations[LIES_WITHIN]).toEqual(['np1']);
        done();
    });




    // tests from former process()

    it('set inverse relation', async done => {

        const result = await processRelations([
                d('nf1', 'Feature', 'newFeature', { liesWithin: ['et1'], isAfter: ['ef1']})
            ],
            validator, operationCategoryNames, get, relationInverses, { mergeMode: false });

        expect(result[0].resource.relations['isBefore'][0]).toEqual('nf1');
        done();
    });


    it('child of existing operation', async done => {

        const documents = [
            d('nf1', 'Feature', 'newFeature', { liesWithin: ['et1'] })
        ];

        await processRelations(documents,
            validator, operationCategoryNames, get, relationInverses, { mergeMode: false });

        const resource = documents[0].resource;
        expect(resource.id).toBe('nf1');
        expect(resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('child of existing operation, assign via resource id', async done => {

        const documents = [
            d('nf1', 'Feature', 'newFeature', { liesWithin: ['et1'] })
        ];

        await processRelations(
            documents,
            validator, operationCategoryNames, get, relationInverses, { mergeMode: false });

        const resource = documents[0].resource;
        expect(resource.id).toBe('nf1');
        expect(resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('child of existing feature', async done => {

        const documents = [
            d('nf1', 'Feature', 'newFeature', { liesWithin: ['ef1']})
        ]

        const result = await processRelations(documents,
            validator, operationCategoryNames, get, relationInverses,
            {});

        const resource = documents[0].resource;
        expect(resource.id).toBe('nf1');
        expect(resource.relations[RECORDED_IN][0]).toEqual('et1');
        expect(resource.relations[LIES_WITHIN][0]).toEqual('ef1');
        done();
    });


    it('import operation', async done => {

        const documents = [
            d('t', 'Trench', 'zero')
        ];
        await processRelations(documents,
            validator,
            operationCategoryNames,
            get, relationInverses, {});

        const resource = documents[0].resource;
        expect(resource.identifier).toBe('zero');
        expect(resource.relations[RECORDED_IN]).toBeUndefined();
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('import operation including feature', async done => {

        const documents = [
            d('tOne', 'Trench', 'one'),
            d('fTwo', 'Feature', 'two', { liesWithin: ['tOne'] })
        ]

        await processRelations(documents,
            validator, operationCategoryNames, get, relationInverses, {});

        const resource = documents[1].resource;
        expect(resource.identifier).toBe('two');
        expect(resource.relations[RECORDED_IN][0]).toBe('tOne');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('import operation including feature, order reversed', async done => {

        const documents = [
            d('nf1', 'Feature', 'two', { liesWithin: ['nt1'] }),
            d('nt1', 'Trench', 'one')
        ];

        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, {});

        const resource = documents[0].resource;
        expect(resource.identifier).toBe('two');
        expect(resource.relations[RECORDED_IN][0]).toBe('nt1');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('import operation including feature, nest deeper', async done => {

        const documents = [
            d('nt1', 'Trench', 'one'),
            d('nf1', 'Feature', 'two', { liesWithin: ['nt1'] }),
            d('nfi1', 'Find', 'three', { liesWithin: ['nf1'] })
        ];

        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, {});

        const resource = documents[2].resource;
        expect(resource.identifier).toBe('three');
        expect(resource.relations[RECORDED_IN][0]).toBe('nt1');
        expect(resource.relations[LIES_WITHIN][0]).toEqual('nf1');
        done();
    });


    it('import operation including feature, nest deeper, order reversed', async done => {

        const documents = [
            d('nfi1', 'Find', 'three', { liesWithin: ['nf1'] }),
            d('nf1', 'Feature', 'two', { liesWithin: ['nt1'] }),
            d('nt1', 'Trench', 'one')
        ];

        const result = await processRelations(documents, validator, operationCategoryNames, get, relationInverses, {});

        const resource = documents[0].resource;
        expect(resource.identifier).toBe('three');
        expect(resource.relations[RECORDED_IN][0]).toBe('nt1');
        expect(resource.relations[LIES_WITHIN][0]).toEqual('nf1');
        done();
    });


    it('import feature as child of existing operation', async done => {

        const documents = [
            d('nf1', 'Feature', 'one', { liesWithin: ['et1'] })
        ];
        await processRelations(documents , validator, operationCategoryNames, get, relationInverses, {});

        const resource = documents[0].resource;
        expect(resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('import feature as child of existing operation, via operation assignment parameter', async done => {

        const documents = [
            d('nf1', 'Feature', 'one')
        ];
        const result = await processRelations(documents, validator, operationCategoryNames, get, relationInverses, { operationId: 'et1' });

        const resource = documents[0].resource;
        expect(resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('nested resources, topmost child of existing operation', async done => {

        const documents = [
            d('nf1', 'Feature', 'one', { liesWithin: ['et1'] }),
            d('nfi1', 'Find', 'two', { liesWithin: ['nf1'] })
        ];

        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, {});

        expect(documents[0].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[0].resource.relations[LIES_WITHIN]).toBeUndefined();
        expect(documents[1].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[1].resource.relations[LIES_WITHIN][0]).toBe('nf1');
        done();
    });


    it('nested resources, topmost child of existing operation, order reversed', async done => {

        const documents = [
            d('nfi1', 'Find', 'two', { liesWithin: ['nf1'] }),
            d('nf1', 'Feature', 'one', { liesWithin: ['et1']})
        ];
        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, {});

        expect(documents[0].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[0].resource.relations[LIES_WITHIN][0]).toBe('nf1');
        expect(documents[1].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[1].resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('nested resources, assignment to operation via operation assignment parameter', async done => {

        const documents = [
            d('nf1', 'Feature', 'one'),
            d('nfi1', 'Find', 'two', { liesWithin: ['nf1'] })
        ];

        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, { operationId: 'et1' });

        expect(documents[0].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[0].resource.relations[LIES_WITHIN]).toBeUndefined();
        expect(documents[1].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[1].resource.relations[LIES_WITHIN][0]).toBe('nf1');
        done();
    });


    it('nested resources, assignment to operation via operation assignment parameter, order reversed', async done => {

        const documents = [
            d('nfi1', 'Find', 'two', { liesWithin: ['nf1'] }),
            d('nf1', 'Feature', 'one')
        ];
        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, { operationId: 'et1' });

        expect(documents[0].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[0].resource.relations[LIES_WITHIN][0]).toBe('nf1');
        expect(documents[1].resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(documents[1].resource.relations[LIES_WITHIN]).toBeUndefined();
        done();
    });


    it('assignment to existing operation via parameter, also nested in existing', async done => {

        const documents = [
            d('nf1', 'Feature', 'one', { liesWithin: ['ef1']})
        ];
        await processRelations(documents, validator, operationCategoryNames, get, relationInverses, { operationId: 'et1' });

        const resource = documents[0].resource;
        expect(resource.id).toBe('nf1');
        expect(resource.relations[RECORDED_IN][0]).toBe('et1');
        expect(resource.relations[LIES_WITHIN][0]).toBe('ef1');
        done();
    });
});
