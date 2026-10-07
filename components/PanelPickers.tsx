import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "../styles/ExplorerPanel.module.css";

function joinClassNames(...classNames: Array<string | null | undefined | false>) {
  return classNames.filter(Boolean).join(" ");
}

export type ListboxOption = { value: string; label: string };

export type ListboxGroup = { label?: string; options: ListboxOption[] };

type ToggleSwitchProps = {
  checked: boolean;
  className?: string;
  labelledBy?: string;
  onChange: (checked: boolean) => void;
};

export const ToggleSwitch = ({ checked, className, labelledBy, onChange }: ToggleSwitchProps) => (
  <button
    aria-checked={checked}
    aria-labelledby={labelledBy}
    className={joinClassNames(styles.toggle, className)}
    onClick={() => onChange(!checked)}
    role="switch"
    type="button"
  >
    <span className={styles.toggleThumb} />
  </button>
);

const SELECT_GAP = 6;
const SELECT_MAX_HEIGHT = 320;
const SELECT_VIEWPORT_MARGIN = 12;

/**
 * Places the list in viewport coordinates. It is portalled to <body> because the
 * panels scroll (and use backdrop-filter), which would otherwise clip it.
 */
function getListPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - SELECT_GAP - SELECT_VIEWPORT_MARGIN;
  const spaceAbove = rect.top - SELECT_GAP - SELECT_VIEWPORT_MARGIN;
  const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(SELECT_MAX_HEIGHT, openUpward ? spaceAbove : spaceBelow);
  const minWidth = rect.width;
  const left = Math.max(
    SELECT_VIEWPORT_MARGIN,
    Math.min(rect.left, window.innerWidth - minWidth - SELECT_VIEWPORT_MARGIN),
  );

  return openUpward
    ? { bottom: window.innerHeight - rect.top + SELECT_GAP, left, maxHeight, minWidth }
    : { top: rect.bottom + SELECT_GAP, left, maxHeight, minWidth };
}

type ListboxProps = {
  className?: string;
  /** Pass either a flat option list or labelled groups. */
  groups?: ListboxGroup[];
  /** Id of the visible label element for this picker. */
  labelledBy: string;
  onChange: (value: string) => void;
  options?: ListboxOption[];
  value: string;
};

/**
 * A select replacement: a trigger button plus a portalled listbox with keyboard
 * navigation (arrows, Home/End, Enter/Space, Escape) and typeahead.
 */
export const Listbox = ({
  className,
  groups,
  labelledBy,
  onChange,
  options,
  value,
}: ListboxProps) => {
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const valueId = `${baseId}-value`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typeaheadRef = useRef({ query: "", timeout: 0 });
  const sections = groups ?? [{ options: options ?? [] }];
  const flat = sections.flatMap((group) => group.options);
  const selectedIndex = flat.findIndex((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const [position, setPosition] = useState<CSSProperties>({});
  const getOptionId = (index: number) => `${baseId}-option-${index}`;

  const close = useCallback((restoreFocus: boolean) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const open = (index = selectedIndex) => {
    if (!triggerRef.current) {
      return;
    }

    setPosition(getListPosition(triggerRef.current));
    setActiveIndex(Math.max(index, 0));
    setIsOpen(true);
  };

  const choose = (index: number) => {
    const option = flat[index];
    if (option !== undefined && option.value !== value) {
      onChange(option.value);
    }
    close(true);
  };

  useEffect(() => {
    if (isOpen) {
      listRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.getElementById(getOptionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }

      close(false);
    };

    const reposition = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) {
        return;
      }

      if (triggerRef.current) {
        setPosition(getListPosition(triggerRef.current));
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [close, isOpen]);

  const typeahead = (character: string) => {
    const state = typeaheadRef.current;
    window.clearTimeout(state.timeout);
    state.query += character.toLowerCase();
    state.timeout = window.setTimeout(() => {
      state.query = "";
    }, 600);

    const start = state.query.length === 1 ? activeIndex + 1 : activeIndex;
    for (let offset = 0; offset < flat.length; offset += 1) {
      const index = (start + offset) % flat.length;
      if (flat[index]?.label.toLowerCase().startsWith(state.query)) {
        return index;
      }
    }

    return -1;
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
    }
  };

  const handleListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const lastIndex = flat.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, lastIndex));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      case "Home":
      case "PageUp":
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
      case "PageDown":
        event.preventDefault();
        setActiveIndex(lastIndex);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const index = typeahead(event.key);
          if (index >= 0) {
            setActiveIndex(index);
          }
        }
    }
  };

  const renderOption = (option: ListboxOption, index: number) => (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles keyboard selection via aria-activedescendant
    <div
      aria-selected={index === selectedIndex}
      className={joinClassNames(
        styles.selectOption,
        index === activeIndex && styles.selectOptionActive,
        index === selectedIndex && styles.selectOptionSelected,
      )}
      id={getOptionId(index)}
      key={option.value}
      onClick={() => choose(index)}
      onPointerMove={() => setActiveIndex(index)}
      role="option"
      tabIndex={-1}
    >
      <span aria-hidden className={styles.selectCheck} />
      <span>{option.label}</span>
    </div>
  );

  let offset = 0;
  const renderedSections = sections.map((group, groupIndex) => {
    const start = offset;
    offset += group.options.length;
    const items = group.options.map((option, index) => renderOption(option, start + index));

    if (!group.label) {
      return items;
    }

    const headingId = `${baseId}-group-${groupIndex}`;
    return (
      // biome-ignore lint/a11y/useSemanticElements: ARIA listboxes group options with role="group", not <fieldset>
      <div aria-labelledby={headingId} className={styles.selectGroup} key={headingId} role="group">
        <div className={styles.selectGroupLabel} id={headingId} role="presentation">
          {group.label}
        </div>
        {items}
      </div>
    );
  });

  return (
    <>
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelledBy} ${valueId}`}
        className={joinClassNames(
          styles.selectTrigger,
          isOpen && styles.selectTriggerOpen,
          className,
        )}
        onClick={() => (isOpen ? close(true) : open())}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.selectValue} id={valueId}>
          {flat[selectedIndex]?.label ?? value}
        </span>
        <span aria-hidden className={styles.selectChevron} />
      </button>
      {isOpen
        ? createPortal(
            <div
              aria-activedescendant={getOptionId(activeIndex)}
              aria-labelledby={labelledBy}
              className={styles.selectList}
              id={listboxId}
              onKeyDown={handleListKeyDown}
              ref={listRef}
              role="listbox"
              style={position}
              tabIndex={-1}
            >
              {renderedSections}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
