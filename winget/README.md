# winget manifests

Manifests for publishing AuraBoard to the Windows Package Manager, so users can run:

```
winget install dexisworking.AuraBoard
```

`manifests/d/dexisworking/AuraBoard/<version>/` holds the three files winget requires
(version, installer, locale). They are validated with:

```bash
winget validate --manifest winget/manifests/d/dexisworking/AuraBoard/1.0.0
```

## Publishing

These files live here for version control; winget only sees them once they are merged
into [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs). Submit with
[wingetcreate](https://github.com/microsoft/winget-create), which opens the pull request
for you:

```bash
winget install Microsoft.WingetCreate
wingetcreate submit --token <github-pat> winget/manifests/d/dexisworking/AuraBoard/1.0.0
```

Or fork `winget-pkgs`, copy the folder to the same path, and open a PR by hand.

## Before submitting

- **`InstallerSha256` must match the published binary byte for byte.** Re-hash after any
  rebuild — the installer is rebuilt on every `build:win`, and each build produces a
  different hash even from identical source.
- The manifest points at the **standard** installer, not the predefined one. Package
  managers should not ship hundreds of megabytes of bundled wallpapers.
- Microsoft's validation pipeline scans the installer with SmartScreen and Defender. An
  unsigned installer with no download reputation may be held for manual review.

## Updating for a new version

1. Copy the version folder to the new version number
2. Update `PackageVersion` in all three files, plus `InstallerUrl`, `InstallerSha256`,
   `ReleaseDate` and `ReleaseNotesUrl`
3. Re-run `winget validate`, then submit
