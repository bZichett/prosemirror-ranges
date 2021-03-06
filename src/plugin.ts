import { Plugin } from "prosemirror-state";
import { RailSet, RailMarkTypeMap } from "./rail-set";
import {
  createRailSetEndDecos,
  createRailSetCursorDecos
} from "./utils/decoration";
import { transformPasted } from "./utils/transform-pasted";
import { maybeAppendTransaction } from "./utils/transaction";
import { DecorationSet } from "prosemirror-view";
import { TOGGLE_KEY } from "./utils/command";
import { namespaceClass as ns } from "./utils/classes";
import { handleClick, ClickHandler } from "./utils/handle-click";

type State = RailSet;

// TODO: allow generics for railName, meta (once added) etc.
const ranges = (
  markTypes: RailMarkTypeMap,
  historyPlugin: Plugin,
  handleEndClick: ClickHandler,
  getId?: () => string
) =>
  new Plugin<State>({
    state: {
      init: (_, state) => RailSet.fromDoc(markTypes, state.doc, getId),
      apply: (tr, rs) =>
        rs.update(
          tr.mapping.map.bind(tr.mapping),
          tr.selection.from,
          tr.selection.to,
          tr.docChanged,
          (tr.getMeta(historyPlugin) || tr.getMeta("paste")) && {
            markTypes,
            doc: tr.doc
          },
          tr.getMeta(TOGGLE_KEY)
        )
    },
    appendTransaction: function(this: Plugin<State>, trs, oldState, newState) {
      return maybeAppendTransaction(
        markTypes,
        this.getState(newState),
        trs,
        newState,
        historyPlugin
      );
    },
    props: {
      transformPasted: transformPasted(Object.values(markTypes)),
      handleClick: function(this: Plugin<State>, view, _, event) {
        return handleClick(
          (railName, id) => {
            const rail = this.getState(view.state).rails[railName];
            return rail ? rail.find(r => r.id === id) || null : null;
          },
          handleEndClick,
          view,
          event
        );
      },
      attributes: function(
        this: Plugin<State>,
        state
      ): { [attr: string]: string } {
        const rs = this.getState(state);
        return rs.cursorAtBoundary !== null
          ? { class: ns("hide-selection") }
          : {};
      },
      decorations: function(this: Plugin<State>, state) {
        const rs = this.getState(state);
        return DecorationSet.create(state.doc, [
          ...createRailSetEndDecos(rs),
          ...createRailSetCursorDecos(rs)
        ]);
      }
    }
  });

export { ranges };
