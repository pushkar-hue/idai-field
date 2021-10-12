const fs = typeof window !== 'undefined' ? window.require('fs') : require('fs');


/**
 * @author Daniel de Oliveira
 */
export class FsAdapter {

    public fileExists(path: string) {

        return fs.existsSync(path);
    }


    public writeFile(path: string, contents: any) {

        fs.writeFileSync(path, contents);
    }


    public readFile(path: string) {

        return fs.readFileSync(path);
    }


    public isDirectory(path: string) {

        return fs.lstatSync(path).isDirectory();
    }


    // see https://stackoverflow.com/a/16684530
    public listFiles(dir) {

        const self = this;

        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function(file) {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                /* Recurse into a subdirectory */
                results = results.concat(self.listFiles(file));
            } else {
                /* Is a file */
                results.push(file);
            }
        });
        return results;
    }
}
