<script>
  import { phoneAgent, sipStore, authToken } from "./PhoneAgentStore";
  import axios from "axios";
  import { createHash } from "sha256-uint8array";

  import config from "../config.json";
  // Must be distributed from Secure HTTP
  import JsSIP from "jssip";
  // JsSIP.debug.enable("JsSIP:*");

  let user_id = "";
  let password = "";
  let loginFailed = false;

  function startPhoneAgent() {
    let sipUri = "sip:" + user_id + "@" + config.sip_server;
    sipStore.set(sipUri);

    let socket = new JsSIP.WebSocketInterface(config.web_socket);
    let configuration = {
      uri: sipUri,
      // authorization_user: user_id,
      password: password,
      display_name: user_id,
      sockets: [socket],
    };

    let ua = new JsSIP.UA(configuration);
    ua.on("connected", function (e) {
      console.log("connected");
    });
    ua.on("disconnected", function (e) {
      console.error("disconnected");
      ua.stop();
      phoneAgent.set(null);
      password = "";
      loginFailed = true;
    });

    ua.on("registered", function (e) {
      console.log("registered");
      // move to Phone
      phoneAgent.set(ua);
      console.log(ua);
    });
    ua.on("unregistered", function (e) {
      console.log("unregistered");
    });
    ua.on("registrationFailed", function (e) {
      console.log("registrationFailed");
      password = "";
      loginFailed = true;
    });

    ua.start();
  }

  function onSubmit() {
    console.log("Login");
    console.log(user_id, password);
    loginFailed = false;

    if (config.firewall) {
      authToken.set({
        username: user_id,
        password: password,
      });

      const time = Math.round(Date.now() / 1000);
      console.log(time);
      const digest = createHash()
        .update(user_id + password + time)
        .digest("hex");
      axios
        .post("/auth", {
          time: time,
          username: user_id,
          digest: digest,
        })
        .then((response) => {
          console.log(response.data);
          if (response.data.auth) {
            startPhoneAgent();
          } else {
            password = "";
            loginFailed = true;
          }
        });
    } else {
      startPhoneAgent();
    }
  }
</script>

<div>
  <h2>Login</h2>
  {#if loginFailed}
    <div class="alert alert-warning d-flex align-items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        class="bi bi-exclamation-circle"
        viewBox="0 0 16 16"
      >
        <path
          d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
        />
        <path
          d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"
        />
      </svg>
      <div>Login failed</div>
    </div>
  {/if}
  <form on:submit|preventDefault={onSubmit}>
    <div class="form-floating mb-3">
      <input
        type="text"
        class="form-control"
        id="user"
        placeholder="12345"
        bind:value={user_id}
      />
      <label for="floatingInput">User ID</label>
    </div>

    <div class="form-floating mb-3">
      <input
        type="password"
        class="form-control"
        id="password"
        placeholder="*"
        bind:value={password}
      />
      <label for="floatingInput">Password</label>
    </div>

    <div class="row mb-3">
      <button type="submit" class="btn btn-primary col-sm-2"> Login </button>
    </div>
  </form>
</div>
