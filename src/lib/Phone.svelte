<script>
  import { onDestroy } from "svelte";
  import { phoneAgent, sipStore, authToken } from "./PhoneAgentStore";
  import axios from "axios";
  import { createHash } from "sha256-uint8array";

  import config from "../config.json";
  import JsSIP from "jssip";
  // JsSIP.debug.enable("JsSIP:*");

  let sipUri;

  sipStore.subscribe((value) => {
    console.log(value);
    sipUri = value;
  });

  const callOptions = {
    mediaConstraints: {
      audio: true, // only audio calls
      video: false,
    },
  };

  let dialNumber = "";
  $: callNumber = () => {
    return dialNumber.replace(/[^\d\*#]/g, "");
  };

  const PhoneState = {
    Idele: 0,
    Calling: 1,
    Incoming: 2,
    Online: 3,
  };
  let phoneSate = PhoneState.Idele;

  let session;
  let audio;

  // make function reactive
  $: phoneIsIdle = () => {
    return phoneSate == PhoneState.Idele;
  };

  $: phoneIsCalling = () => {
    return phoneSate == PhoneState.Calling;
  };

  $: phoneIsIncoming = () => {
    return phoneSate == PhoneState.Incoming;
  };

  $: phoneIsOnline = () => {
    return phoneSate == PhoneState.Online;
  };

  const timer = setInterval(() => {
    console.log("Keep-Alive");
    // $phoneAgent.sendOptions(
    //   sip: sipUri,
    //   null,
    //   optionsOptions
    // );
    $phoneAgent.sendOptions(sipUri);
  }, 30000);
  onDestroy(() => clearInterval(timer));

  if (config.firewall) {
    // Reauthorize to keep open WebSocket.
    const auth_timer = setInterval(() => {
      console.log("Reauth");
      const time = Math.round(Date.now() / 1000);
      console.log(time);
      const digest = createHash()
        .update($authToken.username + $authToken.password + time)
        .digest("hex");
      axios
        .post("/auth", {
          time: time,
          username: $authToken.username,
          digest: digest,
        })
        .then((response) => {
          console.log(response.data);
        });
    }, 1000 * 60 * 20); // every 20 min.
    onDestroy(() => clearInterval(auth_timer));
  }

  document.body.addEventListener("keydown", (event) => {
    console.log(event.key);
    if (phoneSate == PhoneState.Idele) {
      if (event.key.match(/^[\d\-\*#]$/)) {
        dialNumber = dialNumber + event.key;
      } else if (event.ctrlKey && event.key == "v") {
        // paste from clipboad
        navigator.clipboard
          .readText()
          .then(
            (text) =>
              (dialNumber = dialNumber + text.replace(/[^\d\-\*#\(\)]/g, ""))
          );
      } else if (event.key == "Delete") {
        dialNumber = "";
      } else if (event.key == "Backspace") {
        if (dialNumber.length > 0) {
          dialNumber = dialNumber.slice(0, -1);
        }
      } else if (event.key == "Enter") {
        makeCall();
      }
    } else if (phoneSate == PhoneState.Incoming) {
      if (event.key == "Enter") {
        // make a call or answer ringing.
        dialNumber = "";
        answerCall();
      } else if (event.key == "Delete") {
        hangupCall();
      }
    } else if (phoneSate == PhoneState.Online) {
      if (event.key.match(/^[\d\*#]$/)) {
        clickedDialPad(event.key);
      }
    }
  });

  $phoneAgent.on("newRTCSession", function (data) {
    console.log("New Settion");
    console.log(data);

    let display_name = data.request.from.display_name || "Anonymous";
    let header = new JsSIP.NameAddrHeader(data.request.from.uri);
    console.log("From: " + display_name + " " + header.toString());

    if (phoneSate != PhoneState.Idele) {
      console.log("tell busy");
      data.session.terminate();
      return;
    }

    session = data.session;
    session.on("connecting", function (e) {
      console.log("connecting");
      console.log(e);
    });
    session.on("peerconnection", function (e) {
      // set remote audio stream (to listen to remote audio)
      // remoteAudio is <audio> element on page
      console.log("peerconnection");
    });
    session.on("progress", function (data) {
      console.log("progress");
    });
    session.on("accepted", function (e) {
      console.log("accepted");
      // console.log(session);
      phoneSate = PhoneState.Online;
    });

    session.on("confirmed", function () {
      //the call has connected, and audio is playing
      console.log("confirmed");
      console.log(session);
    });
    session.on("ended", function () {
      //the call has ended
      console.log("ended");
      session = null;
      phoneSate = PhoneState.Idele;
      dialNumber = "";
    });
    session.on("failed", function (e) {
      // unable to establish the call
      console.log("failed");
      console.log(e.cause);
      session = null;
      if (audio) {
        audio.pause();
      }
      audio = null;
      phoneSate = PhoneState.Idele;
      dialNumber = "";
    });

    if (session.direction === "outgoing") {
      phoneSate = PhoneState.Calling;
      playCallingSound();
      addSoundStream();
    } else if (session.direction === "incoming") {
      phoneSate = PhoneState.Incoming;
      playCallingSound();
    }
  });

  function playCallingSound() {
    audio = document.createElement("audio");
    // https://otologic.jp/free/se/phone02.html
    audio.src = "./ring1.mp3";
    audio.loop = true;
    audio.play();
  }

  function addSoundStream() {
    session.connection.addEventListener("addstream", function (e) {
      console.log("connection add stream");
      if (audio) {
        audio.pause();
      }
      audio = document.createElement("audio");
      audio.srcObject = e.stream;
      audio.play();
    });
  }

  function makeCall() {
    if (callNumber().length > 0) $phoneAgent.call(callNumber(), callOptions);
  }

  function hangupCall() {
    if (session) {
      console.log("Hangup call");
      session.terminate();
    }
  }

  function answerCall() {
    if (session) {
      console.log("Answer call");
      session.answer(callOptions);
      addSoundStream();
    }
  }

  function clickedDialPad(number) {
    dialNumber = dialNumber + number;
    if (session) {
      session.sendDTMF(number);
    }
  }
</script>

<main>
  <div class="row">
    <div class="col-sm-5">
      <table class="table table-borderless text-center phone">
        <thead>
          <tr>
            <th colspan="3">{dialNumber}</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td on:click={() => clickedDialPad("1")}>1</td>
            <td on:click={() => clickedDialPad("2")}>2</td>
            <td on:click={() => clickedDialPad("3")}>3</td>
          </tr>
          <tr>
            <td on:click={() => clickedDialPad("4")}>4</td>
            <td on:click={() => clickedDialPad("5")}>5</td>
            <td on:click={() => clickedDialPad("6")}>6</td>
          </tr>
          <tr>
            <td on:click={() => clickedDialPad("7")}>7</td>
            <td on:click={() => clickedDialPad("8")}>8</td>
            <td on:click={() => clickedDialPad("9")}>9</td>
          </tr>
          <tr>
            <td on:click={() => clickedDialPad("*")}>*</td>
            <td on:click={() => clickedDialPad("0")}>0</td>
            <td on:click={() => clickedDialPad("#")}>#</td>
          </tr>
        </tbody>
      </table>

      {#if phoneIsIdle() && callNumber() != ""}
        <div class="row mb-2">
          <button type="button" class="btn btn-success" on:click={makeCall}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              class="bi bi-telephone-outbound-fill"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511zM11 .5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-4.146 4.147a.5.5 0 0 1-.708-.708L14.293 1H11.5a.5.5 0 0 1-.5-.5z"
              />
            </svg>
          </button>
        </div>
      {:else if phoneIsIncoming()}
        <div class="row mb-2">
          <button type="button" class="btn btn-success" on:click={answerCall}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              class="bi bi-telephone-inbound-fill"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511zM15.854.146a.5.5 0 0 1 0 .708L11.707 5H14.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 1 0v2.793L15.146.146a.5.5 0 0 1 .708 0z"
              />
            </svg>
          </button>
        </div>
      {:else if phoneIsOnline() || phoneIsCalling()}
        <div class="row mb-2">
          <button type="button" class="btn btn-danger" on:click={hangupCall}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              class="bi bi-telephone-x-fill"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511zm9.261 1.135a.5.5 0 0 1 .708 0L13 2.793l1.146-1.147a.5.5 0 0 1 .708.708L13.707 3.5l1.147 1.146a.5.5 0 0 1-.708.708L13 4.207l-1.146 1.147a.5.5 0 0 1-.708-.708L12.293 3.5l-1.147-1.146a.5.5 0 0 1 0-.708z"
              />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  .phone th {
    height: 50px;
    border-width: 1px;
    border-color: black;
  }

  .phone td {
    text-align: center;
    font-weight: bold;
    vertical-align: middle;
    height: 60px;
    /* width: 60px;
    border-radius: 50%;
    background: salmon;
    color: white; */
    background: paleturquoise;
    color: black;
    border-width: 2px;
  }

  .phone td:hover {
    background-color: lightskyblue;
    cursor: pointer;
  }

  .phone td:active {
    cursor: pointer;
    background: orange;
  }
</style>
