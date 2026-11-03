/**
 * Entry of the module's own dev server and build. The shell never loads this
 * file: it loads the exposed pages through remoteEntry.js. It only tells a
 * developer who opens http://localhost:5174 what to do next.
 */
const root = document.getElementById("root");
if (root) {
  root.innerHTML =
    "<p>Specimen Follow-up module remote. Open OpenELIS and set " +
    '<code>localStorage["oe.module-override.specimen-followup"] = ' +
    '"http://localhost:5174/remoteEntry.js"</code>, then reload.</p>';
}
