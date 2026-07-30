export function toPixelBounds(region, naturalWidth, naturalHeight) {
  const values = [region.x, region.y, region.width, region.height, naturalWidth, naturalHeight];
  if (
    !values.every(Number.isFinite)
    || region.x < 0
    || region.y < 0
    || region.width <= 0
    || region.height <= 0
    || region.x + region.width > 1
    || region.y + region.height > 1
    || naturalWidth <= 0
    || naturalHeight <= 0
  ) {
    throw new TypeError("Region must be inside the image");
  }
  return {
    sx: Math.round(region.x * naturalWidth),
    sy: Math.round(region.y * naturalHeight),
    sw: Math.round(region.width * naturalWidth),
    sh: Math.round(region.height * naturalHeight),
  };
}
