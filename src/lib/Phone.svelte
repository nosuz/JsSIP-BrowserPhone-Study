<script>
  import { onDestroy } from "svelte";
  import { phoneAgentStore, sipStore } from "./PhoneAgentStore";

  import JsSIP from "jssip";
  // JsSIP.debug.enable("JsSIP:*");

  let phoneAgent;
  let sipUri;

  phoneAgentStore.subscribe((value) => {
    console.log(value);
    phoneAgent = value;
  });

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
  let onSession = false;
  let incoming = false;

  let session;
  let audio;

  const timer = setInterval(() => {
    console.log("Keep-Alive");
    // phoneAgent().sendOptions(
    //   sip: sipUri,
    //   null,
    //   optionsOptions
    // );
    phoneAgent.sendOptions(sipUri);
  }, 30000);
  onDestroy(() => clearInterval(timer));

  document.body.addEventListener("keydown", (event) => {
    console.log(event.key);
    if (event.key.match(/^[\d\-\*#]$/)) {
      dialNumber = dialNumber + event.key;
    } else if (event.key == "Delete") {
      dialNumber = "";
    } else if (event.key == "Backspace") {
      if (dialNumber.length > 0) {
        dialNumber = dialNumber.slice(0, -1);
      }
    } else if (event.key == "Enter") {
      // make a call or answer ringing.
      if (incoming) {
        dialNumber = "";
        answerCall();
      } else {
        if (!onSession && dialNumber.length > 0) {
          phoneAgent.call(dialNumber, callOptions);
        }
      }
    }
  });

  phoneAgent.on("newRTCSession", function (data) {
    console.log("New Settion");
    console.log(data);

    var display_name = data.request.from.display_name || "Anonymous";
    var header = new JsSIP.NameAddrHeader(data.request.from.uri);
    console.log("From: " + display_name + " " + header.toString());

    if (onSession) {
      console.log("tell busy");
      data.session.terminate();
      return;
    }

    session = data.session;
    onSession = true;
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
      incoming = false;
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
      onSession = false;
      incoming = false;
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
      onSession = false;
      incoming = false;
      dialNumber = "";
    });

    if (session.direction === "outgoing") {
      add_sound_stream();
    } else if (session.direction === "incoming") {
      incoming = true;
      audio = document.createElement("audio");
      // https://otologic.jp/free/se/phone02.html
      audio.src = "./ring2.mp3";
      audio.loop = true;
      audio.play();
    }
  });

  function add_sound_stream() {
    session.connection.addEventListener("addstream", function (e) {
      console.log("connection addtream");
      if (audio) {
        audio.pause();
      }
      audio = document.createElement("audio");
      audio.srcObject = e.stream;
      audio.play();
    });
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
      add_sound_stream();
    }
  }

  function clieckDialPad(number) {
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
            <td on:click={() => clieckDialPad("1")}>1</td>
            <td on:click={() => clieckDialPad("2")}>2</td>
            <td on:click={() => clieckDialPad("3")}>3</td>
          </tr>
          <tr>
            <td on:click={() => clieckDialPad("4")}>4</td>
            <td on:click={() => clieckDialPad("5")}>5</td>
            <td on:click={() => clieckDialPad("6")}>6</td>
          </tr>
          <tr>
            <td on:click={() => clieckDialPad("7")}>7</td>
            <td on:click={() => clieckDialPad("8")}>8</td>
            <td on:click={() => clieckDialPad("9")}>9</td>
          </tr>
          <tr>
            <td on:click={() => clieckDialPad("*")}>*</td>
            <td on:click={() => clieckDialPad("0")}>0</td>
            <td on:click={() => clieckDialPad("#")}>#</td>
          </tr>
        </tbody>
      </table>

      {#if onSession}
        <div class="row mb-2">
          <button type="button" class="btn btn-danger" on:click={hangupCall}>
            Hangup
          </button>
        </div>
      {/if}
      {#if incoming}
        <div class="row mb-2">
          <button type="button" class="btn btn-success" on:click={answerCall}>
            Accept
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
