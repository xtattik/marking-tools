# Stage 5 Science Rubric Builder

Open `index.html` to use the app.

The app lets you:

- choose Stage 5 Science outcomes
- include theory, applied, or both criteria
- build an assignment-specific rubric
- mark a student against each selected criterion
- generate an editable feedback comment
- save and reload the current plan in the browser
- print the rubric, marking sheet, and comment

The original spreadsheet is not changed.

## Local AI version

This copy includes a local `llama.cpp` option for richer feedback comments.

1. Start your `llama-server` batch file.
2. Open `index.html`.
3. Select outcomes and mark at least one descriptor.
4. Use `Generate with Local AI`.

Default endpoint:

`http://127.0.0.1:8080/v1/chat/completions`

If the button cannot connect, check that the local server is running and that the browser allows requests from this local HTML file to `127.0.0.1:8080`.

The original non-AI app remains in the `stage5-rubric-app` folder.

## Canvas rubric export

The design page includes `Export Canvas CSV`.

The export displays the CSV in the app, then tries to save it with a Save As picker. If saving is blocked, use `Download` or `Copy CSV` from the export panel.

The export uses this point mapping:

- No Evidence / Not Submitted: 0
- Limited: 1
- Working Towards Standard: 2
- At Standard: 3
- Above Standard: 4
- Well Above Standard: 5
- Beyond Stage: 5

Canvas publishes a rubric CSV upload endpoint and a template endpoint, but individual Canvas instances can be picky about their import template. If your Canvas rejects the file, download the official rubric upload template from your Canvas instance and the exporter can be adjusted to match it exactly.
