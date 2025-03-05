<template>
  <section class="section">
    <h2 class="title has-text-centered has-text-primary">Want to get in touch?</h2>
    <p class="subtitle has-text-centered mt-4">I'm always open to new opportunities and projects. </p>

    <div class="columns">
      <div class="column is-half is-offset-one-quarter">
        <form class="form" name="contact" action="/success" method="POST">
          <div class="field">
            <label class="label" for="yourName">Name</label>
            <div class="control">
              <input class="input" name="name" type="text" id="yourName" required="true">
            </div>
          </div>
          <div class="field">
            <label class="label" for="yourEmail">Email</label>
            <div class="control">
              <input class="input" name="email" type="email"  id="yourEmail" required="true">
            </div>
          </div>
          <div class="field">
            <label class="label" for="message">Message</label>
            <div class="control">
              <textarea class="textarea" name="message" id="message" rows="4" required="true"></textarea>
            </div>
          </div>
          <div class="field">
            <div class="control">
              <button class="button is-primary has-text-white" type="submit">Let's talk</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>