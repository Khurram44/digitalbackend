 
  // Function to translate month names to Dutch
  function translateMonthToDutch(month) {
    const months = {
      "January": "januari",
      "February": "februari",
      "March": "maart",
      "April": "april",
      "May": "mei",
      "June": "juni",
      "July": "juli",
      "August": "augustus",
      "September": "september",
      "October": "oktober",
      "November": "november",
      "December": "december"
    };
    return months[month] || month;
  }
  
  // Function to convert relative time to Dutch
  function convertRelativeTime(time) {
    if (time.endsWith("m")) {
      const minutes = time.replace("m", "");
      return `${minutes} minuten geleden`;
    } if (time.endsWith("h")) {
      const hours = time.replace("h", "");
      return `${hours} uur geleden`;
    } else if (time.endsWith("d")) {
      const days = time.replace("d", "");
      return `${days} dagen geleden`;
    }
    return time;
  }
  
  // Function to convert absolute date to Dutch format
  function convertAbsoluteDate(dateStr) {
    if (!dateStr) return "";
    
    // Handle relative times like "17m"
    if (/^\d+[mhd]$/.test(dateStr)) return dateStr;
    
    const dateParts = dateStr.split(" ");
    
    // Extract day, month, and optional year/time
    let day, month, rest = [];
    if (dateParts.length >= 2) {
        day = dateParts[0];
        month = translateMonthToDutch(dateParts[1]);
        rest = dateParts.slice(2);
    } else {
        return dateStr; // Return original if format not recognized
    }
    
    // Reconstruct the date string
    const result = [day, month, ...rest].filter(Boolean).join(" ");
    return result;
}
  
  // Process the data to update dates
  function resultJSON(data){
  const updatedData = data.map(item => {
    // Update root-level date
    if (item.date) {
      if (item.date.includes("h") || item.date.includes("d")|| item.date.includes("m")) {
        item.date = convertRelativeTime(item.date);
      } else {
        item.date = convertAbsoluteDate(item.date);
      }
    }
  
    // Update dates inside latestPost
    if (item.latestPost && Array.isArray(item.latestPost)) {
      item.latestPost.forEach(post => {
        if (post.date) {
          if (post.date.includes("h") || post.date.includes("d")|| item.date.includes("m")) {
            post.date = convertRelativeTime(post.date);
          } else {
            post.date = convertAbsoluteDate(post.date);
          }
        }
      });
    }
  
    return item;
  });
  return updatedData
}

module.exports = {resultJSON}