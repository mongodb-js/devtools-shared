/* AUTO-GENERATED DO NOT EDIT. */

export interface DownloadCenterConfig {
  versions: {
    _id: string;
    version: string;
    platform: (PlatformWithDownloadLink | PlatformWithPackages)[];
  }[];
  manual_link: string;
  release_notes_link: string;
  previous_releases_link: string;
  development_releases_link: string;
  supported_browsers_link: string;
  tutorial_link: string;
}
export interface PlatformWithDownloadLink {
  arch: string;
  os: string;
  name: string;
  download_link: string;
}
export interface PlatformWithPackages {
  arch: string;
  os: string;
  packages: Package;
}
export interface Package {
  links: Link[];
}
export interface Link {
  download_link: string;
  name: string;
}
