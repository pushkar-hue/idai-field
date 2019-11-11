import {to} from 'tsfun';
import {createApp, setupSettingsService, setupSyncTestDb} from './subsystem-helper';
import {Importer} from '../../app/core/import/importer';
import {TypeUtility} from '../../app/core/model/type-utility';
import {ValidationErrors} from '../../app/core/model/validation-errors';
import {ImportErrors} from '../../app/core/import/exec/import-errors';
import {PouchdbManager} from '../../app/core/datastore/core/pouchdb-manager';

/**
 * @author Daniel de Oliveira
 */
describe('Import/Subsystem', () => {

    let datastore;
    let _projectConfiguration;

    beforeEach(async done => {

        await setupSyncTestDb();
        const {projectConfiguration} = await setupSettingsService(new PouchdbManager());
        _projectConfiguration = projectConfiguration;
        const {fieldDocumentDatastore} = await createApp();
        datastore = fieldDocumentDatastore;
        done();
    });


    it('create one operation', async done => {

       await Importer.doImport(
           'native',
           new TypeUtility(_projectConfiguration),
           datastore,
           { getUsername: () => 'testuser'},
           _projectConfiguration,
           undefined,
           false,
           false,
           '{ "type": "Trench", "identifier" : "t1", "shortDescription" : "Our Trench 1"}', () => '101');

        const result = await datastore.find({});
        expect(result.documents.length).toBe(1);
        expect(result.documents[0].resource.identifier).toBe('t1');
        done();
    });


    it('produce validation error', async done => {

        const trench = await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}});

        const report = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            trench.resource.id,
            false, false,
            '{ "type": "Find", "identifier" : "obob1", "shortDescription" : "O.B. One", "geometry": { "type": "UnsupportedGeometryType", "coordinates": [1, 2] } }',
            () => '101');

        expect(report.errors[0]).toEqual([ValidationErrors.UNSUPPORTED_GEOMETRY_TYPE, "UnsupportedGeometryType"]);
        done();
    });


    it('liesWithin not set', async done => {

        const report = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            '',
            false, false,
            '{ "type": "Find", "identifier" : "obob1", "shortDescription" : "O.B. One" }',
            () => '101');

        expect(report.errors[0]).toEqual([ImportErrors.NO_PARENT_ASSIGNED]);
        done();
    });


    it('liesWithin not set (but does not matter)', async done => {

        const report = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            '',
            false, false,
            '{ "type": "Trench", "identifier" : "obob1", "shortDescription" : "O.B. One" }',
            () => '101');

        expect(report.errors.length).toBe(0);
        done();
    });


    it('create one find, connect to existing operation', async done => {

        const stored = await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}});

        await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            stored.resource.id,
            false, false,
            '{ "type": "Find", "identifier" : "f1", "shortDescription" : "Our Find 1"}',
            () => '101');

        const result = await datastore.find({});
        expect(result.documents.length).toBe(2);
        expect(result.documents.map(to('resource.identifier'))).toContain('t1');
        expect(result.documents.map(to('resource.identifier'))).toContain('f1');
        done();
    });


    it('invalid structure - do not import', async done => {

        const resourceId = (await datastore.create(
            { resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}}
            )).resource.id;

        const importReport = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            resourceId,
            false, false,
            '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature1"}'+ "\n"
                    + '{ "type": "InvalidType", "identifier" : "f2", "shortDescription" : "feature2"}',
            () => '101');

        expect(importReport.errors[0]).toEqual([ImportErrors.INVALID_TYPE, 'InvalidType']);
        const result = await datastore.find({});
        expect(result.documents.length).toBe(1); // only the trench
        done();
    });


    it('update field', async done => {

        await datastore.create({ resource: { id: 'a', identifier: 'a', type: 'Trench', relations: {} }});
        await datastore.create({ resource: { identifier: 'f1', type: 'Feature', shortDescription: 'feature1', relations: { isRecordedIn: ['a']}}});

        await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser' },
            _projectConfiguration,
            undefined,
            true, false,
            '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature_1" }',
            () => '101');

        const result = await datastore.find({});
        expect(result.documents[1].resource.shortDescription).toBe('feature_1');
        done();
    });


    it('delete field', async done => {

        await datastore.create({ resource: { id: 'a', identifier: 'a', type: 'Trench', relations: {} }});
        await datastore.create({ resource: {
            identifier: 'f1',
            type: 'Feature',
            shortDescription: 'feature1',
                relations: { isRecordedIn: ['a'] }
        } });

        await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser' },
            _projectConfiguration,
            undefined,
            true, true,
            '{ "type": "Feature", "identifier" : "f1", "shortDescription": null }',
            () => '101');

        const result = await datastore.find({});
        expect(result.documents[1].resource.shortDescription).toBeUndefined();
        done();
    });


    it('delete relation', async done => {

        await datastore.create({ resource: { id: 'a', identifier: 'a', type: 'Trench', relations: { } }});
        await datastore.create({ resource: {
                id: 'f1',
                identifier: 'f1',
                type: 'Feature',
                relations: { isRecordedIn: ['a'], isAfter: ['f2'] }
            } });
        await datastore.create({ resource: {
                id: 'f2',
                identifier: 'f2',
                type: 'Feature',
                relations: { isRecordedIn: ['a'], isBefore: ['f1'] }
            } });

        await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser' },
            _projectConfiguration,
            undefined,
            true, true,
            '{ "type": "Feature", "identifier" : "f1", "relations": { "isAfter": null } }',
            () => '101');

        const result = await datastore.find({});
        expect(result.documents[1].resource.relations.isAfter).toBeUndefined();
        expect(result.documents[2].resource.relations.isBefore).toBeUndefined();
        done();
    });


    it('unmatched items on merge', async done => {

        await datastore.create({ resource: { identifier: 'f1', type: 'Feature', shortDescription: 'feature1', relations: { isRecordedIn: ['a']}}});

        const importReport = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            undefined,
            true, false,
            '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature_1"}' + "\n"
                + '{ "type": "Feature", "identifier" : "notexisting", "shortDescription" : "feature_2"}',
            () => '101');

        expect(importReport.errors.length).toBe(1);
        expect(importReport.errors[0][0]).toEqual(ImportErrors.UPDATE_TARGET_NOT_FOUND);
        const result = await datastore.find({});
        expect(result.documents.length).toBe(1);
        expect(result.documents[0].resource.shortDescription).toBe('feature1'); // nothing gets updated at all
        done();
    });


    it('import trench not allowed, when import into operation is activated', async done => {

        await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our trench 1', relations: {}}});

        const importReport = await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            'f1',
            false, false,
            '{ "type": "Trench", "identifier" : "t2", "shortDescription" : "Our Trench 2"}',
            () => '101');

        expect(importReport.errors[0][0]).toEqual(ImportErrors.OPERATIONS_NOT_ALLOWED);

        const result = await datastore.find({});
        expect(result.documents[0].resource.identifier).toBe('t1');
        done();
    });


    it('postprocess documents', async done => {

        await datastore.create({ resource: { id: 'tr1', identifier: 'trench1', type: 'Trench', shortDescription: 'Our trench 1', relations: {}}});

        await Importer.doImport(
            'native',
            new TypeUtility(_projectConfiguration),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            'tr1',
            false, false,
            '{ "type": "Feature", "identifier": "abc", "dating" : [{ "type": "after", "begin": { "inputYear": 100, "inputType": "bce" }}]}',
            () => '101');

        const result = await datastore.find({});
        expect(result.documents[0].resource['dating'][0]['begin']['year']).toBe(-100);
        done();
    });
});
