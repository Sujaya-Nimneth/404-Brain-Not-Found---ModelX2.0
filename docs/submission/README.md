# ATIE Submission Package

| Artifact | Description |
|---|---|
| `ATIE-Technical-Report.pdf` | Seven-page technical report with architecture, evaluation, safety rules, and evidence |
| `two-page-summary.md` | Editable source for the two-page competition summary |
| `ATIE-Two-Page-Summary.pdf` | Verified two-page summary |
| `demo-script.md` | Timed three-minute recording plan and encoding command |
| `../evidence/live-dashboard.png` | Final live-model dashboard capture |
| `../evidence/atie-demo.mp4` | Three-minute MP4 walkthrough |

The PDFs are generated from `build_reports.py` using the bundled ReportLab
runtime. The browser recording is generated with:

```bash
cd ../../frontend
ATIE_E2E_URL=http://localhost:15173 npm run demo:record
```

The raw WebM recording is ignored; the checked-in MP4 is the submission
artifact. The normative system behavior remains in the repository root
`CONTRACTS.md`.
