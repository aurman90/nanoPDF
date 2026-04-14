Third-party binary: Ghostscript
================================

File: gs
Purpose: PDF compression via `gs -sDEVICE=pdfwrite -dPDFSETTINGS=...`
Invoked from: lib/pdf-compress-gs.ts (child_process.execFile)

Target platform
---------------
Linux x86_64 (glibc). This binary is used at runtime on Vercel serverless
functions (AWS Lambda, Amazon Linux 2/2023). It will NOT run on macOS or
other platforms — on those, lib/pdf-compress-gs.ts falls back to the system
`gs` on PATH if present, otherwise lib/pdf-compress.ts falls back to the
pdf-lib + sharp path.

Source
------
Binary obtained from:
  https://github.com/shelfio/ghostscript-lambda-layer
  file: ghostscript-x86_64.zip

That project builds Ghostscript from official Artifex sources inside an
amazonlinux:2 Docker image. Upstream Ghostscript releases:
  https://ghostscript.com/releases/gsdnld.html
  https://github.com/ArtifexSoftware/ghostpdl-downloads

Configuration
-------------
The binary is dynamically linked but depends only on core glibc components
(libc, libdl, libm, libpthread), which are present on every glibc Linux
system including the Vercel Lambda runtime.

Configured with `--without-luratech`; uses Ghostscript's internal image
codecs rather than external libjpeg/libpng.

License
-------
Ghostscript is licensed under the GNU Affero General Public License
version 3 (AGPL-3.0). The full license text is at:
  ./LICENSE.ghostscript

The nanoPDF application code (not this binary) is licensed separately.
Running Ghostscript as an isolated subprocess via child_process.execFile
does not create a combined or derivative work with the host application
(no linking, no incorporation of Ghostscript code into the host's address
space at build or load time).
