import {Observable} from "rxjs/Observable";
import {Document} from "idai-components-2/core";

export class ParserError extends SyntaxError {
    lineNumber: number;
    errorData: string;
}

export interface Parser {

    /**
     * Parses content to extract documents.
     * @param content
     */
    parse(content:string): Observable<Document>;
}