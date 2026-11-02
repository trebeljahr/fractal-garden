import { type FormEvent, useId, useState } from "react";
import styles from "../styles/AnnounceSignup.module.css";

const ANNOUNCE_SIGNUP_URL = "https://ricos.site/api/announce-signup";
const SOMETHING_WENT_WRONG = "Something went wrong. Try again?";

/**
 * One line under the work, never a modal or a banner. The sentence is Rico's,
 * word for word. The request holds the address and the honeypot, nothing about
 * this page: ricos.site/api/announce-signup does the double opt-in.
 */
export const AnnounceSignup = () => {
  const emailId = useId();
  const [status, setStatus] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const website = form.elements.namedItem("website") as HTMLInputElement;
    if (!email.checkValidity()) {
      setStatus("Enter a valid email address first.");
      return;
    }

    setState("sending");
    setStatus("Subscribing…");
    try {
      const response = await fetch(ANNOUNCE_SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value, website: website.value }),
      });
      const data: { success?: string; errorMessage?: string } = await response.json();
      setState(data.success ? "done" : "idle");
      setStatus(data.success ?? data.errorMessage ?? SOMETHING_WENT_WRONG);
    } catch {
      setState("idle");
      setStatus(SOMETHING_WENT_WRONG);
    }
  };

  return (
    <form className={styles.signup} onSubmit={submit} noValidate>
      <label className={styles.label} htmlFor={emailId}>
        I make a new thing every month or two. Want one email when the next one is out? Nothing
        else.
      </label>
      {state === "done" ? null : (
        <div className={styles.row}>
          <div className={styles.honeypot} aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <input
            className={styles.input}
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <button className={styles.button} type="submit" disabled={state === "sending"}>
            Subscribe
          </button>
        </div>
      )}
      <p className={styles.status} role="status">
        {status}
      </p>
    </form>
  );
};
