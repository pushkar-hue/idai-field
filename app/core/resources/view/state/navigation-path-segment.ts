import {to, on} from 'tsfun';
import {differentFromBy} from 'tsfun/by';
import {Document, FieldDocument} from 'idai-components-2';
import {ViewContext} from './view-context';


/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 */
export interface NavigationPathSegment extends ViewContext {

    readonly document: FieldDocument;
}


export module NavigationPathSegment {

    export function isValid(mainTypeDocumentResourceId: string|undefined, segment: NavigationPathSegment,
                            segments: Array<NavigationPathSegment>,
                            exists: (_: string) => boolean): boolean {

        return exists(segment.document.resource.id)
            && hasValidRelation(mainTypeDocumentResourceId, segment, segments);
    }


    function hasValidRelation(mainTypeDocumentResourceId: string|undefined, segment: NavigationPathSegment,
                              segments: Array<NavigationPathSegment>): boolean {

        const index = segments.indexOf(segment);

        return index === 0
            ? mainTypeDocumentResourceId !== undefined
                && (Document.hasRelationTarget(segment.document, 'isRecordedIn', mainTypeDocumentResourceId)
                    || ['Place', 'TypeCatalog'].includes(segment.document.resource.type))
            : Document.hasRelationTarget(segment.document,
                'liesWithin', segments[index - 1].document.resource.id);
    }
}


export const toResourceId = to('document.resource.id');


export const differentFrom = differentFromBy(on('document.resource.id'));