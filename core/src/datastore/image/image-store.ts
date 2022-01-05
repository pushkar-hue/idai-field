import { FilesystemAdapterInterface } from './filesystem-adapter-interface';
import { ThumbnailGeneratorInterface } from './thumbnail-generator-interface';

export enum ImageVariant {
    ORIGINAL = "original_image", 
    THUMBNAIL = "thumbnail_image"
}

export const THUMBNAIL_TARGET_HEIGHT: number = 320;

export const thumbnailDirectory = 'thumbs/';
export const tombstoneSuffix = '.deleted';

/**
 * An image store that uses the file system to store the original images and
 * thumbnails in order to be able to sync them.
 *
 * @author Sebastian Cuy
 * @author Thomas Kleinke
 * @author Daniel De Oliviera
 * @author Simon Hohl
 */
export class ImageStore {

    private absolutePath: string | undefined = undefined;
    private activeProject: string | undefined = undefined;

    constructor(
        private filesystem: FilesystemAdapterInterface,
        private converter: ThumbnailGeneratorInterface) {
    }

    public getAbsoluteRootPath = (): string | undefined => this.absolutePath;
    public getActiveProject = (): string | undefined => this.activeProject;

    /**
     * Initializiation function.
     * @param fileSystemBasePath The base path for the project's image store. Will be used to construct absolute 
     * paths for the injected {@link FilesystemAdapterInterface} implementation.
     */
    public init(fileSystemBasePath: string, activeProject: string): void {
        
        this.absolutePath = fileSystemBasePath.endsWith('/') ? fileSystemBasePath : fileSystemBasePath + '/';
        this.activeProject = activeProject;

        const originalsPath = this.getDirectoryPath(activeProject, ImageVariant.ORIGINAL)
        if (!this.filesystem.exists(originalsPath)) {
            this.filesystem.mkdir(originalsPath, true);
        }

        const thumbnailsPath = this.getDirectoryPath(activeProject, ImageVariant.THUMBNAIL);
        if (!this.filesystem.exists(thumbnailsPath)) {
            this.filesystem.mkdir(thumbnailsPath, true);
        }
    }


    /**
     * Store data with the provided id.
     * @param imageId the identifier for the data
     * @param data the binary data to be stored
     */
    public async store(imageId: string, data: Buffer, project: string = this.activeProject, type: ImageVariant = ImageVariant.ORIGINAL) {

        const filePath = this.getFilePath(project, type, imageId);

        this.filesystem.writeFile(filePath, data);

        if (type === ImageVariant.ORIGINAL) {
            await this.createThumbnail(imageId, data, project);
        }
    }

    /**
     * Returns the raw Buffer data for the requested image.
     * @param imageId the identifier for the image
     * @param type variant type of the image, see {@link ImageVariant}.
     */
    public async getData(imageId: string, type: ImageVariant, project: string = this.activeProject): Promise<Buffer> {
        return await this.readFileSystem(imageId, type, project);
    }

    /**
     * Removes the image from the filesystem and creates an empty tombstone file with
     * the same name plus a {@link tombstoneSuffix}.
     * @param imageId the identifier for the image to be removed
     */
    public async remove(imageId: string, project: string = this.activeProject): Promise<any> {
        this.filesystem.remove(
            this.getFilePath(project, ImageVariant.ORIGINAL, imageId)
        );
        this.filesystem.writeFile(
            this.getFilePath(project, ImageVariant.ORIGINAL, imageId) + tombstoneSuffix, Buffer.from([])
        );
        this.filesystem.remove(
            this.getFilePath(project, ImageVariant.THUMBNAIL, imageId)
        );
        this.filesystem.writeFile(
            this.getFilePath(project, ImageVariant.THUMBNAIL, imageId) + tombstoneSuffix, Buffer.from([])
        );
    }

    public deleteProject(project: string) {
        this.filesystem.remove(this.getDirectoryPath(project), true);
    }

    public getFileIds(project: string, types: ImageVariant[] = []): { [uuid: string]: ImageVariant[]} {

        let originalFileNames = [];
        let thumbnailFileNames = [];

        if(types.length === 0){
            originalFileNames = this.getFileNames(this.getDirectoryPath(project, ImageVariant.ORIGINAL));
            thumbnailFileNames = this.getFileNames(this.getDirectoryPath(project, ImageVariant.THUMBNAIL));
        } else {
            if(types.includes(ImageVariant.ORIGINAL)){
                originalFileNames = this.getFileNames(this.getDirectoryPath(project, ImageVariant.ORIGINAL));
            } else if(types.includes(ImageVariant.THUMBNAIL)) {
                thumbnailFileNames = this.getFileNames(this.getDirectoryPath(project, ImageVariant.THUMBNAIL));
            }
        }

        const result = {};
        for(const fileName of originalFileNames){
            if(fileName in result) result[fileName].push(ImageVariant.ORIGINAL)
            else result[fileName] = [ImageVariant.ORIGINAL]
        }
        
        for(const fileName of thumbnailFileNames){
            if(fileName in result) result[fileName].push(ImageVariant.THUMBNAIL)
            else result[fileName] = [ImageVariant.THUMBNAIL]
        }

        return result;
    }

    private getFileNames(path: string) {

        return this.filesystem.listFiles(path)
            .map((filePath) => {
                return filePath.slice((path).length)
            });
    }


    private async readFileSystem(imageId: string, type: ImageVariant, project: string): Promise<Buffer> {

        const path = this.getFilePath(project, type, imageId);

        if (type === ImageVariant.THUMBNAIL && !this.filesystem.exists(path))
        {
            const originalFilePath = this.getFilePath(project, ImageVariant.ORIGINAL, imageId);
            if (this.filesystem.exists(originalFilePath)) {
                await this.createThumbnail(imageId, this.filesystem.readFile(originalFilePath), project);
            }
        }

        return this.filesystem.readFile(path);
    }

    private async createThumbnail(imageId: string, data: Buffer, project: string) {

        const buffer = await this.converter.generate(data, THUMBNAIL_TARGET_HEIGHT);
        const thumbnailPath = this.getFilePath(project, ImageVariant.THUMBNAIL, imageId);
        this.filesystem.writeFile(thumbnailPath, buffer);
    }

    private getDirectoryPath(project: string, type?: ImageVariant) {
        if (type === undefined || type === ImageVariant.ORIGINAL) {
            return this.absolutePath + project + '/';
        } else {
            return this.absolutePath + project + '/' + thumbnailDirectory;
        }
    }

    private getFilePath(project: string, type: ImageVariant, uuid: string) {
        return this.getDirectoryPath(project, type) + uuid;
    }
}
