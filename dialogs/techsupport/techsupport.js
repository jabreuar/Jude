// techsupport.js defines the techsupport dialog

// Import required Bot Builder
const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Minimum length requirements for service tag and detail issue
const SERVICE_TAG_LENGTH_MIN = 3;
const ISSUE_DETAIL_LENGTH_MIN = 20;
const CBA_LENGTH_MIN = 3;
const REPLAY_MIN = 1;
const PHONE_NUMBER_LENGTH_MIN = 9;

// Dialog IDs
const PROFILE_DIALOG = 'profileDialog';

// Prompt IDs
const SERVICE_TAG_PROMPT = 'serviceTagPrompt';
const ISSUE_DETAIL_PROMPT = 'issueDetailPrompt';
const CBA_PROMPT = 'cbaPrompt';
const SCHEDULE_PROMPT = 'schedulePrompt';
const PHONE_NUMBER_PROMPT = 'phoneNumberPrompt';

const VALIDATION_SUCCEEDED = true;
const VALIDATION_FAILED = !VALIDATION_SUCCEEDED;

const YES_ANSWER = "YES";

const DIAGNOSTIC_URL = "https://www.dell.com/support/home/us/en/19/product-support/servicetag/{serviceTag}/diagnose";

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
class TechSupport extends ComponentDialog {
  constructor(dialogId, userProfileAccessor) {
    super(dialogId);

    // validate what was passed in
    if (!dialogId) throw new Error('Missing parameter.  dialogId is required');
    if (!userProfileAccessor) throw new Error('Missing parameter.  userProfileAccessor is required');

    // Add a water fall dialog with 4 steps.
    // The order of step function registration is importent
    // as a water fall dialog executes steps registered in order
    this.addDialog(new WaterfallDialog(PROFILE_DIALOG, [
      this.promptForServiceTagStep.bind(this),
      this.promptForDetails.bind(this),
      this.confirmTicket.bind(this),
      this.promptCase.bind(this),
      this.promptConfirmation.bind(this),
      this.promptScheduleTime.bind(this),
      this.promptConfirmSMS.bind(this),
      this.allSetDialoag.bind(this),
      this.endTechSupportDialoag.bind(this)
    ]));

    // Add text prompts for tag and issue detail
    this.addDialog(new TextPrompt(SERVICE_TAG_PROMPT, this.validateServiceTag));
    this.addDialog(new TextPrompt(ISSUE_DETAIL_PROMPT, this.validateIssueDetail));
    this.addDialog(new TextPrompt(CBA_PROMPT, this.validateCba));
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
  async promptForServiceTagStep(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);

    if (!userProfile.serviceTagId) {
      // prompt for serviceTagId, if missing
      return await step.prompt(SERVICE_TAG_PROMPT, 'Ok, I got it! What is your service tag?');
    }
    return await step.next();
  }
  /**
   * Validator function to verify that user name meets required constraints.
   *
   * @param {PromptValidatorContext} validation context for this validator.
   */
  async validateServiceTag(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();
    if (value.length >= SERVICE_TAG_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Service tags need to be at least ${SERVICE_TAG_LENGTH_MIN} characters long.`);
      await validatorContext.context.sendActivity(`Can you type it again?`);
      return VALIDATION_FAILED;
    }
  }

  /**
  * Validator function to verify that user name meets required constraints.
  *
  * @param {PromptValidatorContext} validation context for this validator.
  */
  async validateIssueDetail(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();
    if (value.length >= ISSUE_DETAIL_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Please provide more detailed information.`);
      return VALIDATION_FAILED;
    }
  }

  /**
  * Validator function to verify that user name meets required constraints.
  *
  * @param {PromptValidatorContext} validation context for this validator.
  */
  async validateCba(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();

    if (value.length >= CBA_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Sorry, I couldn't understand`);
      await validatorContext.context.sendActivity(`You can say Yes or No`);
      return VALIDATION_FAILED;
    }
  }

  async validateReplay(validatorContext) {
    // Validate that the user entered a minimum length for their name
    const value = (validatorContext.recognized.value || '').trim();

    if (value.length >= REPLAY_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Sorry, I couldn't understand`);
      await validatorContext.context.sendActivity(`You can say Yes or No`);
      return VALIDATION_FAILED;
    }
  }

  async validatePhoneNumber(validatorContext) {
    const value = (validatorContext.recognized.value || '').trim();

    if (value.length >= PHONE_NUMBER_LENGTH_MIN) {
      return VALIDATION_SUCCEEDED;
    } else {
      await validatorContext.context.sendActivity(`Sorry, this number seems to be invalid. Can you type it again?`);
      return VALIDATION_FAILED;
    }
  }

  async promptForDetails(step) {
    // save serviceTag, if prompted for
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.serviceTagId === undefined && step.result) {
      userProfile.serviceTagId = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }

    await step.context.sendActivity(`Thanks! Please hold until I find your product details`);

    let request = new XMLHttpRequest();
    request.open('GET', `http://ctiicr.us.dell.com:9000/IntelligentContactRouting/VoiceLookup/?phoneNumber=5127172006&dnis=12123&ivrAppName=SR_Comp_Main&lookupType=ESC_ROUTING&lookupValue=${userProfile.serviceTagId}&transactionId=00000001&isUAT=0&debug=1&subType=ESC&buid=11&ivrModuleName=aa`, false);  // `false` makes the request synchronous
    request.send(null);

    let productModel = "LATITUDE 13";

    if (request.status === 200) {
      let jsonObj = JSON.parse(request.responseText);

      let productData = jsonObj["DebugDataElementsFound"]["ProductData"];
      if(productData) {
        productModel = productData.PRODUCT_LINE;
      }
    }

    await step.context.sendActivity(`Great, I found your ${productModel} product.`);

    let formattedUrl = DIAGNOSTIC_URL.replace('{serviceTag}', userProfile.serviceTagId);

    await step.context.sendActivity(`This link might help you: ${formattedUrl}`);

    return await step.prompt(SCHEDULE_PROMPT, `If it doesn't, I can create a ticket for your product issue. Would you like to proceed?`);
  }

  async confirmTicket(step) {
    return await step.prompt(ISSUE_DETAIL_PROMPT, `Ok! Please describe the problem briefly`);

  }

  async promptCase(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.issueDetail === undefined && step.result) {
      userProfile.issueDetail = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }

    await step.context.sendActivity(`Thanks. A ticket was created! :)`);
    return await step.prompt(CBA_PROMPT, `Would you like to schedule a call back to talk to a specialist about it?`);
  }

  async promptConfirmation(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.replay === undefined && step.result) {
      userProfile.replay = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }

    if (userProfile.replay.toUpperCase() === YES_ANSWER) {
      return await step.next();
    }

    await step.context.sendActivity(`I'm very happy to help you. Do you need anything else?`);

    return await step.prompt(CBA_PROMPT, `Would you like to schedule call back once we get an update about your issue?`);
  }

  async promptScheduleTime(step) {
    await step.context.sendActivity(`I have found the following possibilities: \r\n (1) 10am to 11am CST \r\n (2) 13pm to 14pm CST \r\n (3) 16pm to 17pm CST`);
    return await step.prompt(SCHEDULE_PROMPT, `Which time is best for you? (type the number or the time)`);
  }

  async promptConfirmSMS(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.schedule === undefined && step.result) {
      userProfile.schedule = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }
    return await step.prompt(PHONE_NUMBER_PROMPT, `Please enter your phone number (you'll soon receive a confirmation by SMS)`);
  }

  async allSetDialoag(step) {
    const userProfile = await this.userProfileAccessor.get(step.context);
    if (userProfile.phoneNumber === undefined && step.result) {
      userProfile.phoneNumber = step.result;
      await this.userProfileAccessor.set(step.context, userProfile);
    }
    await step.context.sendActivity(`Call back scheduled! :-) You will receive a confirmation by SMS.`);
    return await step.prompt(SCHEDULE_PROMPT, `Can I help you with anything else?`);
  }

  async endTechSupportDialoag(step) {
    await step.context.sendActivity(`It was a pleasure to help you!`);
    return await step.context.sendActivity(`Thanks for contacting Dell.`);
  }
}

exports.TechSupportDialog = TechSupport;