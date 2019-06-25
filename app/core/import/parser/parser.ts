import {Observable} from 'rxjs';
import {Document} from 'idai-components-2';

export interface Parser {

    /**
     * Parses content to extract documents.
     * @param content, a msgWithParams for each problem occurred during parsing.
     */
    parse(content: string): Observable<Document>;
}