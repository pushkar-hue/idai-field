import {HttpClient} from '@angular/common/http';
import {Reader} from './reader';
import {M} from '../../components/m';

/**
 * @author Daniel de Oliveira
 */
export class HttpReader implements Reader {

    constructor(private url: string, private http: HttpClient) {}


    public go(): Promise<string> {

        return new Promise((resolve, reject) => {
            this.http.get(this.url, { responseType: 'text' })
                .subscribe(
                    data => resolve(data),
                    err => {
                        console.error(err);
                        reject([M.IMPORT_FILE_UNREADABLE, this.url])
                    }
                );
        });
    }
}