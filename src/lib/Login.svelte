<script>
  import { phoneAgentStore, sipStore } from "./PhoneAgentStore";

  import config from "../config.json";
  // Must be distributed from Secure HTTP
  import JsSIP from "jssip";
  // JsSIP.debug.enable("JsSIP:*");

  let user_id = "";
  let password = "";

  function onSubmit() {
    console.log("Login");
    console.log(user_id, password);

    var sipUri = "sip:" + user_id + "@" + config.sip_server;
    sipStore.set(sipUri);

    var socket = new JsSIP.WebSocketInterface(config.web_socket);
    var configuration = {
      uri: sipUri,
      // authorization_user: user_id,
      password: password,
      display_name: user_id,
      sockets: [socket],
    };

    var ua = new JsSIP.UA(configuration);
    ua.on("connected", function (e) {
      console.log("connected");
    });
    ua.on("disconnected", function (e) {
      console.log("disconnected");
    });

    ua.on("registered", function (e) {
      console.log("registered");
      // move to Phone
      phoneAgentStore.set(ua);
      console.log(ua);
    });
    ua.on("unregistered", function (e) {
      console.log("unregistered");
    });
    ua.on("registrationFailed", function (e) {
      console.log("registrationFailed");
    });

    ua.start();
  }
</script>

<div>
  <h2>Login</h2>
  <form>
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
      <button
        type="button"
        class="btn btn-primary col-sm-2"
        on:click={onSubmit}
      >
        Login
      </button>
    </div>
  </form>
</div>
