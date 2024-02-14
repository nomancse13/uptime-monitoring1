import { AlertTypeEnum } from 'src/monitrix-auth/common/enum';
export const websiteAlert = (
  websiteId: any,
  type: AlertTypeEnum,
  comparison: string,
  limit: any,
  occur: number,
  contacts: any[],
) => {
  if (type == AlertTypeEnum.RESPONSE_CODE) {
    // response alert
    const createAlertResponseTime: any = {
      websiteId: websiteId,
      type: type,
      comparison: comparison,
      comparisonLimit: limit,
      occurrences: occur,
      contacts: contacts,
    };
    return createAlertResponseTime;
  } else if (type == AlertTypeEnum.LOAD_TIME) {
    // load time alert

    const createAlertLoadTime = {
      websiteId: websiteId,
      type: type,
      comparison: comparison,
      comparisonLimit: limit,
      occurrences: occur,
      contacts: contacts,
    };

    // createAlertLoadTime['websiteId'] = websiteId;

    // createAlertLoadTime['type'] = type;
    // createAlertLoadTime['comparison'] = comparison;
    // createAlertLoadTime['comparisonLimit'] = limit;
    // createAlertLoadTime['occurrences'] = occur;
    // createAlertLoadTime['contacts'] = contacts;

    return createAlertLoadTime;
  } else if (type == AlertTypeEnum.SEARCH_STRING_MISSING) {
    // search string alert

    const createAlertSearchString = {
      websiteId: websiteId,
      type: type,
      comparison: comparison,
      comparisonLimit: limit,
      occurrences: occur,
      contacts: contacts,
    };
    return createAlertSearchString;
  } else {
    return false;
  }
};
