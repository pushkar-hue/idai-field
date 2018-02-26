import {IdaiFieldDocument} from 'idai-components-2/idai-field-model';
import {Static} from '../../../helper/static';
import {MatrixBuilder} from '../../../../../app/components/matrix/matrix-builder';
import {Matrix} from '../../../../../app/components/matrix/matrix';


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export function main() {

    describe('MatrixBuilder', () => {

        const matrixBuilder: MatrixBuilder = new MatrixBuilder();


        it('build simple matrix', () => {

            const feature1: IdaiFieldDocument = Static.idfDoc('Feature 1', 'feature1', 'Feature', 'f1');
            const feature2: IdaiFieldDocument = Static.idfDoc('Feature 2', 'feature2', 'Feature', 'f2');

            feature1.resource.relations['isAfter'] = ['f2'];
            feature2.resource.relations['isBefore'] = ['f1'];

            const matrix: Matrix = matrixBuilder.build([feature1, feature2]);

            expect(matrix.rows.length).toBe(2);
            expect(matrix.rows[0].length).toBe(1);
            expect(matrix.rows[1].length).toBe(1);
            expect(matrix.rows[0][0]).toBe(feature1);
            expect(matrix.rows[1][0]).toBe(feature2);
        });

    });
}