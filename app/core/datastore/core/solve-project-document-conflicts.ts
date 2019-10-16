import {asyncMap} from 'tsfun-extra';
import {assoc, to} from 'tsfun';
import {Resources} from './project-resource-conflict-resolution';
import {Document, Resource} from 'idai-components-2';
import {DatastoreUtil} from './datastore-util';
import getConflicts = DatastoreUtil.getConflicts;
import {ResourceId, RevisionId} from '../../../c';


/**
 * @author Daniel de Oliveira
 */
export async function solveProjectDocumentConflict(
    document:         Document,
    solve:            (_: Resources) => Resources,
    solveAlternative: (_: Resources) => Resource,
    fetch:            (_: ResourceId) => Promise<Document>,
    fetchRevision:    (_: ResourceId, __: RevisionId) => Promise<Document>,
    update:           (_: Document, conflicts: string[]) => Promise<Document>): Promise<Document> {

    const latestRevisionDocument = await fetch(document.resource.id);
    const conflicts = getConflicts(latestRevisionDocument); // fetch again, to make sure it is up to date after the timeout
    if (!conflicts) return document;                        // again, to make sure other client did not solve it in that exact instant

    const conflictedDocuments =
        await asyncMap((resourceId: string) => fetchRevision(document.resource.id, resourceId))
        (conflicts);

    // TODO should be ordered by time ascending, or by revision id and then by time ascending (better because it takes differing times (not set on computer, time zones) into account)
    const resourcesOfCurrentAndOldRevisionDocuments =
        conflictedDocuments
            .concat(latestRevisionDocument)
            .map(to(RESOURCE));

    const resolvedResources = solve(resourcesOfCurrentAndOldRevisionDocuments);
    if (resolvedResources.length === 1) {

        const assembledDocument = assoc(RESOURCE, resolvedResources[0])(latestRevisionDocument); // this is to work with the latest changes history
        return await update(assembledDocument, conflicts);

    } else {

        // TODO
        // compare the length with the length of resourcesOfCurrentAndOldRevisionDocuments.
        // Since we fold from the right and the last resource is of the current document,
        // we know exactly which resources have been successfully auto-resolved.
        // These revisions can then be squashed during the update of the still conflicted
        // (with the remaining conflicts) document.
        //
        // TODO update the doc a first time here
        //
        // When we have a partially solved and squashed document, we can try the alternative way
        // of solving, which creates an entirely new revision with the desired properties for that alternative case.
        const resolvedResource = solveAlternative(resolvedResources);
        const assembledDocument = assoc(RESOURCE, resolvedResource)(latestRevisionDocument);
        // TODO update again

        return assembledDocument;
    }
}


const RESOURCE = 'resource';