import "./style.css";
import { migrateOldSave, readSlot } from "./worlds.js";
migrateOldSave();
const id = new URLSearchParams(location.search).get("mundo");
if (id && readSlot(id)) import("./main.js");
else {
  if (id) history.replaceState(null, "", location.pathname + "#mundos");
  import("./menu.js");
}
// History navigation must see the current save library, not a frozen canvas or a deleted slot.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
