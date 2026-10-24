/** A photo from the recipe editor that's waiting to be uploaded. @param {string | null | undefined} url */
export const isPhotoDataUrl = (url) => /^data:image\/(jpeg|png|webp)[;,]/.test(url ?? '');
