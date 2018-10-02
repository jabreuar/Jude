class UserProfile {
  constructor(name, serviceTagId, issueDetail, replay, schedule, 
    phoneNumber, orderNumber, serviceRequestNumber) {
    this.name = name || undefined;
    this.serviceTagId = serviceTagId || undefined;
    this.issueDetail = issueDetail || undefined;
    this.replay = replay || undefined;
    this.schedule = schedule || undefined;
    this.phoneNumber = phoneNumber || undefined;
    this.orderNumber = orderNumber || undefined;
    this.serviceRequestNumber = serviceRequestNumber || undefined;
  }
};

exports.UserProfile = UserProfile;
