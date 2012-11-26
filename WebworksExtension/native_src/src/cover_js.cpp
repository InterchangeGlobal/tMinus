/*
* Copyright 2012 Research In Motion Limited.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/*
 * Modifications to original source, Copyright 2012 Interchange Global Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "Licence");
 * you may not use this file except in compliance with the Licence.
 * You may obtain a copy of the Licence at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the Licence is distributed on an "AS IS" basis,
 * without warranties or conditions of any kind, either express or implied.
 * See the Licence for the specific language governing permissions and
 * limitations under the Licence.
 */

#include <stdbool.h>
#include <string>
#include <sstream>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/platform.h>
#include <stdio.h>
#include <stdlib.h>
#include <bps/bps.h>
#include <bps/navigator.h>
#include <bps/screen.h>
#include "cover_js.hpp"

using namespace std;

/**
 * Default constructor.
 */
Cover::Cover(const std::string& id) : m_id(id) { }

/**
 * Cover destructor.
 */
Cover::~Cover() { }

/**
 * This method returns the list of objects implemented by this native
 * extension.
 */
char* onGetObjList() {
    static char name[] = "Cover";
    return name;
}

/**
 * This method is used by JNext to instantiate the Cover object when
 * an object is created on the JavaScript server side.
 */
JSExt* onCreateObject(const string& className, const string& id) {
    if (className == "Cover") {
        return new Cover(id);
    }

    return NULL;
}

/**
 * Method used by JNext to determine if the object can be deleted.
 */
bool Cover::CanDelete() {
    return true;
}

/**
 * It will be called from JNext JavaScript side with passed string.
 * This method implements the interface for the JavaScript to native binding
 * for invoking native code. This method is triggered when JNext.invoke is
 * called on the JavaScript side with this native objects id.
 */
string Cover::InvokeMethod(const string& command) {
    // Determine which function should be executed
	if (command == "updateCoverNative") {
		return updateCover();
	} else {
		return "Unsupported Method";
	}
}

/**
 * Function to signal the application update its cover.
 */
string Cover::updateCover() {

	// define an empty response message for this function
	string res = "";

	int state;
	navigator_window_cover_attribute_t* attr;

	// set-up the BPS by initializing it.
	state = bps_initialize();
	if (BPS_SUCCESS == state) {

		// initialization was successful,
		// create a window cover attribute structure
		// this will be used when updating the cover
		state = navigator_window_cover_attribute_create(&attr);

		if (BPS_SUCCESS == state) {

			// the window cover attribute was created ok,
			// use that structure to signal the window cover to be updated
			state = navigator_window_cover_update(attr);
			if (BPS_SUCCESS == state) {

				// now that the cover has been updated
				// free up the area of memory held by the cover attribute structure
				state = navigator_window_cover_attribute_destroy(attr);
				if (BPS_SUCCESS == state) {
					res = "update called successfully";
				} else {
					// convert the state integer to a string so we can build a response with it.
					string sstate = static_cast<ostringstream*>( &(ostringstream() << state) )->str();
					res = "cover destroy problem >" + sstate + "<";
				}

			} else {
				string sstate = static_cast<ostringstream*>( &(ostringstream() << state) )->str();
				res = "invalid update state >" + sstate + "<";
			}

		} else {
			string sstate = static_cast<ostringstream*>( &(ostringstream() << state) )->str();
			res = "Problem creating the cover attribute >" + sstate + "<";
		}

	} else {
		string sstate = static_cast<ostringstream*>( &(ostringstream() << state) )->str();
		res = "could not initialise the BPS >" + sstate + "<";
	}

	// shutdown the BPS and free up and memory that may have been allocated.
	bps_shutdown();
    return res;
}
