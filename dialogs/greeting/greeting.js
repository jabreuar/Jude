// greeting.js defines the greeting dialog

// Import required Bot Builder
const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');

// User state for greeting dialog
const { UserProfile } = require('../model/userProfile');

// Minimum length requirements for name
const NAME_LENGTH_MIN = 3;

// Dialog IDs
const PROFILE_DIALOG = 'profileDialog';

// Prompt IDs
const NAME_PROMPT = 'namePrompt';

const VALIDATION_SUCCEEDED = true;
const VALIDATION_FAILED = !VALIDATION_SUCCEEDED;

/**
 * Demonstrates the following concepts:
 *  Use a subclass of ComponentDialog to implement a multi-turn conversation
 *  Use a Waterfall dialog to model multi-turn conversation flow
 *  Use custom prompts to validate user input
 *  Store conversation and user state
 *
 * @param {String} dialogId unique identifier for this dialog instance
 * @param {PropertyStateAccessor} userProfileAccessor property accessor for user state
 */
class Greeting extends ComponentDialog {
  constructor(dialogId, userProfileAccessor) {
    super(dialogId);

    // validate what was passed in
    if (!dialogId) throw new Error('Missing parameter.  dialogId is required');
    if (!userProfileAccessor) throw new Error('Missing parameter.  userProfileAccessor is required');

    // Add a water fall dialog with 4 steps.
    // The order of step function registration is importent
    // as a water fall dialog executes steps registered in order
    this.addDialog(new WaterfallDialog(PROFILE_DIALOG, [
      this.initializeStateStep.bind(this),
      this.promptForNameStep.bind(this),
      this.displayGreetingStep.bind(this)
    ]));

    // Add text prompts for name 
    this.addDialog(new TextPrompt(NAME_PROMPT, this.validateName));

    // Save off our state accessor for later use
    this.userProfileAccessor = userProfileAccessor;
  }
  /**
   * Waterfall Dialog step functions.
   *
   * Initialize our state.  See if the WaterfallDialog has state pass to it
   * If not, then just new up an empty UserProfile object
   *
   * @param {WaterfallStepContext} step contextual information for the current step being executed
   */
  async initializeStateStep(step) {
    let userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile === undefined) {
      if (step.options && step.options.userProfile) {
        await this.userProfileAccessor.set(step.context, step.options.userProfile);
      } else {
        await this.userProfileAccessor.set(step.context, new UserProfile());
      }
    }
    return await step.next();
  }
  /**
   * Waterfall Dialog step functions.
   *
   * Using a text prompt, prompt the user for their name.
   * Only prompt if we don't have this information already.
   *
   * @param {WaterfallStepContext} step contextual information for the current step being executed
   */
  async promptForNameStep(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    // if we have everything we need, greet user and return
    if (userProfile !== undefined && userProfile.name !== undefined) {
      return await this.greetUser(step);
    }
    if (!userProfile.name) {
      // prompt for name, if missing
      return await step.prompt(NAME_PROMPT, 'What is your name?');
    } else {
      return await step.next();
    }
  }
  /**
   * Waterfall Dialog step functions.
   *
   * Having all the data we need, simply display a summary back to the user.
   *
   * @param {WaterfallStepContext} step contextual information for the current step being executed
   */
  async displayGreetingStep(step) {
    // save name, if prompted for
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.name === undefined && step.result) {
      let lowerCaseName = step.result;
      // capitalize and set name
      userProfile.name = lowerCaseName.charAt(0).toUpperCase() + lowerCaseName.substr(1);
      await this.userProfileAccessor.set(step.context, userProfile);
    }
    return await this.greetUser(step);
  }
  /**
   * Validator function to verify that user name meets required constraints.
   *
   * @param {PromptValidatorContext} validation context for this validator.
   */
  async validateName(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();
    if (value.length >= NAME_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Names need to be at least ${NAME_LENGTH_MIN} characters long.`);
      return VALIDATION_FAILED;
    }
  }
  /**
   * Helper function to greet user with information in greetingState.
   *
   * @param {WaterfallStepContext} step contextual information for the current step being executed
   */
  async greetUser(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    // Display to the user their profile information and end dialog
    await step.context.sendActivity(`Hi ${userProfile.name}, nice to meet you!`);
    await step.context.sendActivity(`How can I help you today?`);
    return await step.endDialog();
  }
}

exports.GreetingDialog = Greeting;