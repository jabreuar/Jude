// techsupport.js defines the techsupport dialog

// Import required Bot Builder
const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');

// Minimum length requirements for service tag and detail issue
const SERVICE_REQUEST_LENGTH_MIN = 3;
const REPLAY_MIN = 1;
const PHONE_NUMBER_LENGTH_MIN = 9;

// Dialog IDs
const PROFILE_DIALOG = 'profileDialog';

// Prompt IDs
const SERVICE_REQUEST_PROMPT = 'serviceRequestPrompt';
const SUBSCRIBE_PROMPT = 'subscribePrompt';
const CBA_PROMPT = 'cbaPrompt';
const SCHEDULE_PROMPT = 'schedulePrompt';
const PHONE_NUMBER_PROMPT = 'phoneNumberPrompt';

const VALIDATION_SUCCEEDED = true;
const VALIDATION_FAILED = !VALIDATION_SUCCEEDED;

const YES_ANSWER = "YES"

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
class ServiceRequest extends ComponentDialog {
  constructor(dialogId, userProfileAccessor) {
    super(dialogId);

    // validate what was passed in
    if (!dialogId) throw new Error('Missing parameter.  dialogId is required');
    if (!userProfileAccessor) throw new Error('Missing parameter.  userProfileAccessor is required');

    // Add a water fall dialog with 4 steps.
    // The order of step function registration is importent
    // as a water fall dialog executes steps registered in order
    this.addDialog(new WaterfallDialog(PROFILE_DIALOG, [
      this.promptForServiceRequest.bind(this),
      this.promptServiceRequestDetail.bind(this),
      this.promptConfirmSMS.bind(this),
      this.endOrderDialoag.bind(this)
    ]));

    // Add text prompts for tag and issue detail
    this.addDialog(new TextPrompt(SERVICE_REQUEST_PROMPT, this.validateServiceRequestNumber));
    this.addDialog(new TextPrompt(SUBSCRIBE_PROMPT, this.validateReplay));
    this.addDialog(new TextPrompt(SCHEDULE_PROMPT, this.validateReplay));
    this.addDialog(new TextPrompt(PHONE_NUMBER_PROMPT, this.validatePhoneNumber));

    // Save off our state accessor for later use
    this.userProfileAccessor = userProfileAccessor;
  }

  /**
   * Waterfall Dialog step functions.
   *
   * Using a text prompt, prompt the user for their name.
   * Only prompt if we don't have this information already.
   *
   * @param {WaterfallStepContext} step contextual information for the current step being executed
   */
  async promptForServiceRequest(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
  
    if (!userProfile.serviceRequestNumber) {
      // prompt for serviceRequestNumber, if missing
      return await step.prompt(SERVICE_REQUEST_PROMPT, 'Ok, I got it! What is your service request number?');
    }
    return await step.next();
  }
  /**
   * Validator function to verify that user name meets required constraints.
   *
   * @param {PromptValidatorContext} validation context for this validator.
   */
  async validateServiceRequestNumber(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();
    if (value.length >= SERVICE_REQUEST_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Service request numbers need to be at least ${SERVICE_REQUEST_LENGTH_MIN} characters long.`);
      return VALIDATION_FAILED;
    }
  }

  async validateReplay(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();

    if (value.length >= REPLAY_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`I didn't get you`);
      return VALIDATION_FAILED;
    }
  }

  async validatePhoneNumber(validatorContext) {
    const value = (validatorContext.recognized.value || '').trim();

    if (value.length >= PHONE_NUMBER_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Please enter a valid phone number`);
      return VALIDATION_FAILED;
    }
  }

  async promptServiceRequestDetail(step) {
    // save serviceTag, if prompted for
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.serviceRequestNumber === undefined && step.result) {
      userProfile.serviceRequestNumber = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }
    
    await step.context.sendActivity(`Your service request ${userProfile.serviceRequestNumber} is Submitted`);
    return await step.prompt(SUBSCRIBE_PROMPT, `Do you want to subscribe for updates?`);
  }
  
  async promptConfirmSMS(step) {
    return await step.prompt(PHONE_NUMBER_PROMPT, `Please enter your phone number`);
  }

  async endOrderDialoag(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.phoneNumber === undefined && step.result) {
      userProfile.phoneNumber = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }

    await step.context.sendActivity(`All set! You will get updates about your service request by SMS.`);
    await step.context.sendActivity(`It was a pleasure to help you!`);
    return await step.context.sendActivity(`Thanks for contacting Dell.`);
  }
}

exports.ServiceRequestDialog = ServiceRequest;